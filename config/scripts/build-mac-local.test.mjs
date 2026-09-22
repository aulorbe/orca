import { describe, expect, it } from 'vitest'
import { createLocalBuildVersion, getMacPackagingArgs } from './build-mac-local.mjs'

describe('createLocalBuildVersion', () => {
  it('packages custom builds for the current Mac only and never publishes', () => {
    expect(getMacPackagingArgs(true, 'arm64')).toContain('--arm64')
    expect(getMacPackagingArgs(true, 'x64')).toContain('--x64')
    expect(getMacPackagingArgs(false, 'arm64')).not.toContain('--arm64')
    expect(getMacPackagingArgs(true, 'arm64').slice(-2)).toEqual(['--publish', 'never'])
  })

  it('creates unique valid prerelease versions without changing the release base', () => {
    expect(createLocalBuildVersion('1.4.159-rc.0', 123456, 'abc123')).toBe(
      '1.4.159-rc.0.local.123456.abc123'
    )
    expect(createLocalBuildVersion('1.4.159', 123456, 'abc123')).toBe('1.4.159-local.123456.abc123')
  })

  it('sanitizes commit identifiers', () => {
    expect(createLocalBuildVersion('1.0.0', 1, 'abc/def')).toBe('1.0.0-local.1.abcdef')
  })
})
