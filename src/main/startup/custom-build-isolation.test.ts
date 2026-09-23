import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app } from 'electron'
import { configureCustomBuildEnvironment, CUSTOM_APP_IDENTITY } from '../../shared/custom-build'
import {
  configureDevUserDataPath,
  configureOrcaUserDataPathEnv,
  shouldInstallManagedHooks
} from './configure-process'
import { getDevInstanceIdentity } from './dev-instance-identity'

vi.mock('electron', () => {
  const paths = new Map([
    ['appData', '/profiles'],
    ['userData', '/profiles/orca']
  ])
  return {
    app: {
      getPath: vi.fn((key: string) => paths.get(key) ?? ''),
      setPath: vi.fn((key: string, value: string) => paths.set(key, value))
    }
  }
})
vi.mock('../e2e-config', () => ({ getMainE2EConfig: () => ({}) }))

afterEach(() => vi.unstubAllEnvs())

describe('custom build isolation', () => {
  it('does not rewrite user-global agent hooks during Custom Dev startup', () => {
    vi.stubEnv('ORCA_CUSTOM_BUILD', undefined)
    vi.stubEnv('ORCA_CUSTOM_DEV', '1')
    expect(shouldInstallManagedHooks(true)).toBe(false)
    expect(shouldInstallManagedHooks(false)).toBe(true)
  })

  it('separates the profile, CLI discovery, app menu, and Keychain name from stock Orca', () => {
    vi.stubEnv('ORCA_CUSTOM_BUILD', undefined)
    vi.stubEnv('ORCA_USER_DATA_PATH', '/profiles/orca')
    configureCustomBuildEnvironment(CUSTOM_APP_IDENTITY.name)
    configureDevUserDataPath(false)
    configureOrcaUserDataPathEnv()
    expect(app.getPath('userData')).toBe(join('/profiles', 'Orca Custom'))
    expect(process.env.ORCA_USER_DATA_PATH).toBe(app.getPath('userData'))
    expect(shouldInstallManagedHooks(false)).toBe(false)
    expect(getDevInstanceIdentity(false, {}, CUSTOM_APP_IDENTITY.name)).toMatchObject({
      name: 'Orca Custom',
      appName: 'Orca Custom',
      appUserModelId: 'com.aulorbe.orca.custom',
      isDev: false
    })
  })

  it('does not turn stock Orca into a custom app through an inherited shell environment', () => {
    vi.stubEnv('ORCA_CUSTOM_BUILD', '1')
    vi.stubEnv('ORCA_USER_DATA_PATH', undefined)
    configureCustomBuildEnvironment('Orca')
    expect(process.env.ORCA_CUSTOM_BUILD).toBeUndefined()
    expect(shouldInstallManagedHooks(false)).toBe(true)
    expect(getDevInstanceIdentity(false, {}, 'Orca').appName).toBe('Orca')
  })
})
