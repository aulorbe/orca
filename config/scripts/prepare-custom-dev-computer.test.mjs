import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  CUSTOM_DEV_COMPUTER_ID,
  customDevComputerAppPath,
  prepareCustomDevComputer
} from './prepare-custom-dev-computer.mjs'

let root, source, destination, run
function seedSource() {
  for (const [name, contents] of [
    ['Contents/Info.plist', 'stock-plist'],
    ['Contents/MacOS/orca-computer-use-macos', 'binary-v1'],
    ['Contents/Resources/AppIcon.icns', 'icon']
  ]) {
    const file = path.join(source, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, contents)
  }
}
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'orca-computer-install-test-'))
  source = path.join(root, 'native/computer-use-macos/.build/release/Orca Computer Use.app')
  destination = customDevComputerAppPath(root)
  seedSource()
  run = vi.fn((command, args) =>
    command.endsWith('PlistBuddy') && args[1].startsWith('Print') ? CUSTOM_DEV_COMPUTER_ID : ''
  )
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

it('installs a distinct user-visible app, signs and registers it without launching or granting permissions', () => {
  expect(prepareCustomDevComputer({ root, destination, platform: 'darwin', run })).toBe(destination)
  expect(destination).toContain('Applications/Orca Custom Dev Computer Use.app')
  expect(run).toHaveBeenCalledWith(
    '/usr/libexec/PlistBuddy',
    expect.arrayContaining([`Set :CFBundleIdentifier ${CUSTOM_DEV_COMPUTER_ID}`])
  )
  expect(run).toHaveBeenCalledWith(
    '/usr/bin/codesign',
    expect.arrayContaining(['--verify', '--deep', '--strict'])
  )
  expect(run).toHaveBeenCalledWith(expect.stringContaining('lsregister'), ['-f', destination])
  expect(
    run.mock.calls.some(([command]) => command.endsWith('/open') || command.endsWith('tccutil'))
  ).toBe(false)
  expect(readFileSync(path.join(source, 'Contents/Info.plist'), 'utf8')).toBe('stock-plist')
})
it('does not replace or re-sign an unchanged helper on every dev launch', () => {
  prepareCustomDevComputer({ root, destination, platform: 'darwin', run })
  run.mockClear()
  prepareCustomDevComputer({ root, destination, platform: 'darwin', run })
  expect(run.mock.calls.some(([command]) => command.endsWith('codesign'))).toBe(false)
})
it('refuses to replace unrelated applications', () => {
  mkdirSync(destination, { recursive: true })
  writeFileSync(path.join(destination, 'keep.txt'), 'keep')
  run.mockReturnValue('com.other.app')
  expect(() => prepareCustomDevComputer({ root, destination, platform: 'darwin', run })).toThrow(
    'unrelated app'
  )
  expect(existsSync(path.join(destination, 'keep.txt'))).toBe(true)
})
it('leaves a running helper intact when the source binary changes', () => {
  prepareCustomDevComputer({ root, destination, platform: 'darwin', run })
  writeFileSync(path.join(source, 'Contents/MacOS/orca-computer-use-macos'), 'binary-v2')
  run.mockImplementation((command) =>
    command === '/bin/ps'
      ? path.join(destination, 'Contents/MacOS/orca-computer-use-macos')
      : CUSTOM_DEV_COMPUTER_ID
  )
  expect(() => prepareCustomDevComputer({ root, destination, platform: 'darwin', run })).toThrow(
    'helper is running'
  )
  expect(
    readFileSync(path.join(destination, 'Contents/MacOS/orca-computer-use-macos'), 'utf8')
  ).toBe('binary-v1')
})
it('keeps the installed helper if preparing its replacement fails', () => {
  prepareCustomDevComputer({ root, destination, platform: 'darwin', run })
  writeFileSync(path.join(source, 'Contents/MacOS/orca-computer-use-macos'), 'binary-v2')
  run.mockImplementation((command, args) => {
    if (command.endsWith('codesign') && args.includes('--force')) {
      throw new Error('Signing failed')
    }
    return command.endsWith('PlistBuddy') && args[1].startsWith('Print')
      ? CUSTOM_DEV_COMPUTER_ID
      : ''
  })
  expect(() => prepareCustomDevComputer({ root, destination, platform: 'darwin', run })).toThrow(
    'Signing failed'
  )
  expect(
    readFileSync(path.join(destination, 'Contents/MacOS/orca-computer-use-macos'), 'utf8')
  ).toBe('binary-v1')
})
it('does nothing on other platforms', () => {
  expect(prepareCustomDevComputer({ root, destination, platform: 'linux', run })).toBeNull()
  expect(run).not.toHaveBeenCalled()
})
