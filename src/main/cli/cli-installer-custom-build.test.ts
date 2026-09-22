import { mkdir, readlink, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { CliInstaller } from './cli-installer'
import { createPackagedMacLauncher, makeFixture } from './cli-installer-test-fixtures'

vi.mock('node:child_process', () => ({ execFile: vi.fn() }))

afterEach(() => vi.unstubAllEnvs())

it('installs and removes orca-custom without taking over the stock orca command', async () => {
  vi.stubEnv('ORCA_CUSTOM_BUILD', '1')
  vi.stubEnv('ORCA_CLI_INSTALL_PATH', undefined)
  const fixture = await makeFixture()
  try {
    const homePath = join(fixture.root, 'home')
    const bin = join(homePath, '.local', 'bin')
    const stockResources = await createPackagedMacLauncher(join(fixture.root, 'stock'))
    const customResources = await createPackagedMacLauncher(join(fixture.root, 'custom'))
    await mkdir(bin, { recursive: true })
    await symlink(join(stockResources, 'bin', 'orca'), join(bin, 'orca'))
    const installer = new CliInstaller({
      platform: 'darwin',
      isPackaged: true,
      userDataPath: fixture.userDataPath,
      appPath: fixture.appPath,
      execPath: '/Applications/Orca Custom.app/Contents/MacOS/Orca Custom',
      resourcesPath: customResources,
      homePath,
      defaultMacCommandPath: join(fixture.root, 'absent', 'bin', 'orca-custom'),
      processPathEnv: bin
    })
    const installed = await installer.install()
    expect(installed.state).toBe('installed')
    expect(installed.commandName).toBe('orca-custom')
    expect(installed.commandPath).toBe(join(bin, 'orca-custom'))
    expect(await readlink(join(bin, 'orca-custom'))).toBe(join(customResources, 'bin', 'orca'))
    await installer.remove()
    expect(await readlink(join(bin, 'orca'))).toBe(join(stockResources, 'bin', 'orca'))
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})
