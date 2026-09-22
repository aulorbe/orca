import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { getDefaultUserDataPath } from './metadata'

afterEach(() => vi.unstubAllEnvs())

it.each([
  { flag: '1', profileName: 'Orca Custom' },
  { flag: undefined, profileName: 'orca' }
])('finds the $profileName macOS profile', ({ flag, profileName }) => {
  vi.stubEnv('ORCA_CUSTOM_BUILD', flag)
  vi.stubEnv('ORCA_USER_DATA_PATH', undefined)
  expect(getDefaultUserDataPath('darwin', '/home/test')).toBe(
    join('/home/test', 'Library', 'Application Support', profileName)
  )
})

it('respects an explicit runtime profile in a custom-managed terminal', () => {
  vi.stubEnv('ORCA_CUSTOM_BUILD', '1')
  vi.stubEnv('ORCA_USER_DATA_PATH', '/isolated-test-profile')
  expect(getDefaultUserDataPath()).toBe('/isolated-test-profile')
})
