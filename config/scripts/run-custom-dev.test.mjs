import { describe, expect, it } from 'vitest'
import { customDevEnvironment } from './run-custom-dev.mjs'

describe('Custom Dev launcher', () => {
  it('isolates the profile and CLI from inherited installed-app settings', () => {
    const env = customDevEnvironment(
      {
        ORCA_USER_DATA_PATH: '/stock-profile',
        ORCA_DEV_USER_DATA_PATH: '/other-dev-profile',
        ORCA_BACKGROUND_LAUNCH: '1',
        ORCA_COMPUTER_MACOS_HELPER_APP_PATH: '/stock/Orca Computer Use.app'
      },
      'darwin',
      '/Users/test'
    )
    expect(env.ORCA_USER_DATA_PATH).toBe('/Users/test/Library/Application Support/Orca Custom Dev')
    expect(env.ORCA_DEV_USER_DATA_PATH).toBe(env.ORCA_USER_DATA_PATH)
    expect(env.ORCA_CLI_COMMAND).toBe(`${env.ORCA_USER_DATA_PATH}/cli/bin/orca`)
    expect(env.ORCA_DEV_DOCK_TITLE).toBe('Orca Custom Dev')
    expect(env.ORCA_DEV_ENFORCE_SINGLE_INSTANCE_LOCK).toBe('1')
    expect(env.ORCA_BACKGROUND_LAUNCH).toBe('1')
    expect(env.ORCA_CUSTOM_DEV).toBe('1')
    expect(env.ORCA_COMPUTER_MACOS_HELPER_APP_PATH).toBe(
      '/Users/test/Applications/Orca Custom Dev Computer Use.app'
    )
  })

  it('supports an explicit isolated test profile', () => {
    expect(
      customDevEnvironment(
        { ORCA_CUSTOM_DEV_USER_DATA_PATH: '/tmp/custom-dev-test' },
        'darwin',
        '/Users/test'
      ).ORCA_USER_DATA_PATH
    ).toBe('/tmp/custom-dev-test')
  })

  it.each(['orca', 'Orca Custom', 'Orca Custom/profiles/local-default'])(
    'refuses to share the installed %s profile',
    (name) => {
      expect(() =>
        customDevEnvironment(
          { ORCA_CUSTOM_DEV_USER_DATA_PATH: `/Users/test/Library/Application Support/${name}` },
          'darwin',
          '/Users/test'
        )
      ).toThrow('separate profile')
    }
  )

  it('uses platform-appropriate profile paths', () => {
    expect(
      customDevEnvironment({ XDG_CONFIG_HOME: '/config' }, 'linux', '/home/test')
        .ORCA_USER_DATA_PATH
    ).toBe('/config/Orca Custom Dev')
    expect(
      customDevEnvironment(
        { APPDATA: 'C:\\Users\\test\\AppData\\Roaming' },
        'win32',
        'C:\\Users\\test'
      ).ORCA_USER_DATA_PATH
    ).toBe('C:\\Users\\test\\AppData\\Roaming\\Orca Custom Dev')
  })
})
