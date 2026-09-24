import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

export const CUSTOM_DEV_COMPUTER_NAME = 'Orca Custom Dev Computer Use'
export const CUSTOM_DEV_COMPUTER_ID = 'com.aulorbe.orca.custom.dev.computer-use'
const EXECUTABLE = 'orca-computer-use-macos'
const MARKER = '.orca-custom-dev-computer.json'
const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'
const repoRoot = path.resolve(import.meta.dirname, '../..')

export function customDevComputerAppPath(home = homedir()) {
  return path.posix.join(home, 'Applications', `${CUSTOM_DEV_COMPUTER_NAME}.app`)
}

export function prepareCustomDevComputer({
  root = repoRoot,
  destination = customDevComputerAppPath(),
  platform = process.platform,
  run = (command, args, options = {}) =>
    execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options })
} = {}) {
  if (platform !== 'darwin') {
    return null
  }
  const source = path.join(root, 'native/computer-use-macos/.build/release/Orca Computer Use.app')
  if (!existsSync(source)) {
    console.log('[custom-dev] Building the Computer Use helper (first run).')
    run(process.execPath, [path.join(root, 'config/scripts/build-computer-macos.mjs')], {
      env: { ...process.env, ORCA_COMPUTER_MACOS_SIGN_IDENTITY: '-' }
    })
  }
  const fingerprint = createHash('sha256')
    .update(CUSTOM_DEV_COMPUTER_ID)
    .update(CUSTOM_DEV_COMPUTER_NAME)
  for (const file of [
    'Contents/Info.plist',
    `Contents/MacOS/${EXECUTABLE}`,
    'Contents/Resources/AppIcon.icns'
  ]) {
    fingerprint.update(readFileSync(path.join(source, file)))
  }
  const sourceHash = fingerprint.digest('hex')
  const markerPath = path.join(destination, 'Contents', MARKER)
  if (existsSync(destination)) {
    if (lstatSync(destination).isSymbolicLink()) {
      throw new Error(`Refusing to replace an app symlink: ${destination}`)
    }
    const id = run('/usr/libexec/PlistBuddy', [
      '-c',
      'Print :CFBundleIdentifier',
      path.join(destination, 'Contents/Info.plist')
    ]).trim()
    if (id !== CUSTOM_DEV_COMPUTER_ID || !existsSync(markerPath)) {
      throw new Error(`Refusing to replace an unrelated app: ${destination}`)
    }
    const installed = JSON.parse(readFileSync(markerPath, 'utf8'))
    if (installed.sourceHash === sourceHash) {
      run(LSREGISTER, ['-f', destination])
      return destination
    }
    const executable = path.join(destination, 'Contents/MacOS', EXECUTABLE)
    if (
      run('/bin/ps', ['-axo', 'comm='])
        .split('\n')
        .some((line) => line.trim() === executable)
    ) {
      throw new Error(
        'The Custom Dev Computer Use helper is running. Finish its actions and close Dev before updating it.'
      )
    }
  }
  mkdirSync(path.dirname(destination), { recursive: true })
  const staging = mkdtempSync(path.join(path.dirname(destination), '.orca-computer-dev-'))
  const stagedApp = path.join(staging, `${CUSTOM_DEV_COMPUTER_NAME}.app`)
  const previous = path.join(staging, 'previous.app')
  let installed = false
  try {
    cpSync(source, stagedApp, { recursive: true })
    const plist = path.join(stagedApp, 'Contents/Info.plist')
    for (const [key, value] of [
      ['CFBundleIdentifier', CUSTOM_DEV_COMPUTER_ID],
      ['CFBundleName', CUSTOM_DEV_COMPUTER_NAME],
      ['CFBundleDisplayName', CUSTOM_DEV_COMPUTER_NAME],
      [
        'NSAccessibilityUsageDescription',
        `${CUSTOM_DEV_COMPUTER_NAME} needs Accessibility permission to inspect and interact with apps when requested.`
      ],
      [
        'NSScreenCaptureUsageDescription',
        `${CUSTOM_DEV_COMPUTER_NAME} needs Screen Recording permission to capture requested app windows.`
      ]
    ]) {
      run('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plist])
    }
    writeFileSync(path.join(stagedApp, 'Contents', MARKER), JSON.stringify({ sourceHash }))
    run('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', stagedApp])
    run('/usr/bin/codesign', ['--verify', '--deep', '--strict', stagedApp])
    if (existsSync(destination)) {
      renameSync(destination, previous)
    }
    try {
      renameSync(stagedApp, destination)
      installed = true
    } catch (error) {
      if (existsSync(previous)) {
        renameSync(previous, destination)
      }
      throw error
    }
  } finally {
    if (installed || !existsSync(previous)) {
      rmSync(staging, { recursive: true, force: true })
    }
  }
  // Registration makes the helper discoverable; granting TCC permissions remains a user action.
  run(LSREGISTER, ['-f', destination])
  console.log(`[custom-dev] Computer Use permission app: ${destination}`)
  return destination
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  prepareCustomDevComputer()
}
