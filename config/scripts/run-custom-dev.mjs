import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../..')

export function customDevEnvironment(
  env = process.env,
  platform = process.platform,
  home = homedir()
) {
  const paths = platform === 'win32' ? path.win32 : path.posix
  const appData =
    platform === 'darwin'
      ? paths.join(home, 'Library', 'Application Support')
      : platform === 'win32'
        ? env.APPDATA || paths.join(home, 'AppData', 'Roaming')
        : env.XDG_CONFIG_HOME || paths.join(home, '.config')
  const profile = env.ORCA_CUSTOM_DEV_USER_DATA_PATH || paths.join(appData, 'Orca Custom Dev')
  const normalized = (value) =>
    platform === 'linux' ? paths.resolve(value) : paths.resolve(value).toLowerCase()
  if (
    ['orca', 'Orca Custom'].some((name) => {
      const installedProfile = normalized(paths.join(appData, name))
      return (
        normalized(profile) === installedProfile ||
        normalized(profile).startsWith(`${installedProfile}${paths.sep}`)
      )
    })
  ) {
    throw new Error('Custom Dev must use a separate profile, not the installed Orca apps’ profile.')
  }
  return {
    ...env,
    ORCA_CUSTOM_DEV: '1',
    ORCA_DEV_USER_DATA_PATH: profile,
    ORCA_USER_DATA_PATH: profile,
    ORCA_DEV_DOCK_TITLE: 'Orca Custom Dev',
    ORCA_DEV_INSTANCE_LABEL: 'Orca Custom Dev',
    ORCA_DEV_REPO_ROOT: repoRoot,
    ORCA_DEV_INSTANCE_KEY: `${repoRoot}:custom-dev`,
    ORCA_DEV_CLI_ENTRY_PATH: path.join(repoRoot, 'out', 'cli', 'index.js'),
    ORCA_CLI_COMMAND: paths.join(profile, 'cli', 'bin', platform === 'win32' ? 'orca.cmd' : 'orca'),
    ORCA_DEV_ENFORCE_SINGLE_INSTANCE_LOCK: '1'
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  process.chdir(repoRoot)
  Object.assign(process.env, customDevEnvironment())
  const help = process.argv.slice(2).some((arg) => ['--help', '-h', '--version'].includes(arg))
  if (!help) {
    console.log(`[custom-dev] Profile: ${process.env.ORCA_DEV_USER_DATA_PATH}`)
    console.log(
      '[custom-dev] UI edits hot-reload. Keep this terminal open; restart this command after backend/CLI edits.'
    )
    execFileSync(
      process.execPath,
      ['config/scripts/ensure-native-runtime.mjs', '--runtime=electron'],
      { stdio: 'inherit' }
    )
    execFileSync(
      process.execPath,
      [
        'node_modules/typescript/bin/tsc',
        '-p',
        'config/tsconfig.cli.json',
        '--outDir',
        'out',
        '--composite',
        'false',
        '--incremental',
        'false'
      ],
      { stdio: 'inherit' }
    )
    execFileSync(
      process.execPath,
      ['config/scripts/verify-cli-bin.mjs', '--fix-executable', '--fix-package-json'],
      { stdio: 'inherit' }
    )
  }
  await import('./run-electron-vite-dev.mjs')
}
