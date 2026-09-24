import { afterEach, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
vi.mock('node:fs', () => ({ existsSync: vi.fn() }))
import {
  resolveMacOSComputerUseAppPath,
  resolveMacOSComputerUseExecutablePath
} from './macos-native-provider-paths'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

it('uses the explicitly selected custom helper and its executable', () => {
  vi.stubEnv('ORCA_COMPUTER_MACOS_HELPER_APP_PATH', '/Applications/Custom Computer Use.app')
  vi.mocked(existsSync).mockReturnValue(true)
  expect(resolveMacOSComputerUseAppPath()).toBe('/Applications/Custom Computer Use.app')
  expect(resolveMacOSComputerUseExecutablePath()).toContain('Custom Computer Use.app')
})
it('does not fall back to the stock helper when an explicit custom helper is missing', () => {
  vi.stubEnv('ORCA_COMPUTER_MACOS_HELPER_APP_PATH', '/missing/Custom.app')
  vi.mocked(existsSync).mockImplementation((target) => String(target) !== '/missing/Custom.app')
  expect(resolveMacOSComputerUseAppPath()).toBeNull()
  expect(resolveMacOSComputerUseExecutablePath()).toBeNull()
  expect(existsSync).toHaveBeenCalledTimes(2)
})
