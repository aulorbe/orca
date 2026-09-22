import { createRequire } from 'node:module'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const configPath = require.resolve('../electron-builder.config.cjs')
const identity = require('../../src/shared/custom-app-identity.json')
const { createMacBuildCompatibility } = require('./mac-build-compatibility.cjs')

afterEach(() => {
  vi.unstubAllEnvs()
  delete require.cache[configPath]
})

function loadConfig(flavor) {
  for (const key of ['ORCA_MAC_RELEASE', 'ORCA_MAC_HOURLY', 'ORCA_MAC_DAILY', 'ORCA_MAC_ADHOC']) {
    vi.stubEnv(key, undefined)
  }
  vi.stubEnv('ORCA_BUILD_FLAVOR', flavor)
  delete require.cache[configPath]
  return require(configPath)
}

describe('custom macOS packaging', () => {
  it('keeps the app, URL registrations, installer and update identity separate', () => {
    const config = loadConfig('custom')
    expect(config.appId).toBe(identity.appId)
    expect(config.productName).toBe('Orca Custom')
    expect(config.extraMetadata).toMatchObject({ name: 'orca-custom', productName: 'Orca Custom' })
    expect(config.protocols).toEqual([])
    expect(config.publish).toBeNull()
    expect(config.dmg.artifactName).toBe('orca-custom-macos-${arch}.${ext}')
    expect(config.forceCodeSigning).toBe(false)
    expect(
      createMacBuildCompatibility({
        version: '1.0.0',
        commit: 'abc123',
        architecture: 'arm64',
        appId: config.appId
      }).appId
    ).toBe(identity.appId)
  })

  it('leaves the upstream packaging path unchanged', () => {
    const config = loadConfig(undefined)
    expect(config.appId).toBe('com.stablyai.orca')
    expect(config.productName).toBe('Orca')
    expect(config.protocols).toEqual([{ name: 'Orca', schemes: ['orca'] }])
    expect(config.publish.owner).toBe('stablyai')
    expect(config.dmg.artifactName).toBe('orca-macos-${arch}.${ext}')
  })

  it.skipIf(process.platform !== 'darwin')(
    'runs launchers in stock and custom bundle paths without crossing profiles',
    () => {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'orca-custom-launcher-')))
      try {
        for (const appName of ['Orca', identity.name]) {
          const custom = appName === identity.name
          const contents = join(root, `${appName}.app`, 'Contents')
          const bin = join(contents, 'Resources', 'bin')
          mkdirSync(bin, { recursive: true })
          mkdirSync(join(contents, 'MacOS'), { recursive: true })
          writeFileSync(
            join(contents, 'Info.plist'),
            `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>${appName}</string>
<key>CFBundleIdentifier</key><string>${custom ? identity.appId : 'com.stablyai.orca'}</string>
</dict></plist>`
          )
          writeFileSync(
            join(contents, 'MacOS', appName),
            '#!/bin/sh\nprintf "%s\\n" "${ORCA_CUSTOM_BUILD-stock}" "$@"\n',
            { mode: 0o755 }
          )
          const launcher = join(bin, 'orca')
          copyFileSync(new URL('../../resources/darwin/bin/orca', import.meta.url), launcher)
          const result = spawnSync('bash', [launcher, 'status', '--json'], {
            encoding: 'utf8',
            env: { ...process.env, ORCA_CUSTOM_BUILD: '1' }
          })
          expect(result.status, result.stderr).toBe(0)
          expect(result.stdout.trim().split('\n')).toEqual([
            custom ? '1' : 'stock',
            join(contents, 'Resources', 'app.asar.unpacked', 'out', 'cli', 'index.js'),
            'status',
            '--json'
          ])
        }
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    }
  )

  it('uses the actual bundle executable and marks only the custom CLI as custom', () => {
    const launcher = readFileSync(
      new URL('../../resources/darwin/bin/orca', import.meta.url),
      'utf8'
    )
    expect(launcher).toContain('Print :CFBundleExecutable')
    expect(launcher).toContain(`"$BUNDLE_ID" == "${identity.appId}"`)
    expect(launcher).toContain('export ORCA_CUSTOM_BUILD=1')
    expect(launcher).toContain('unset ORCA_CUSTOM_BUILD')
  })
})
