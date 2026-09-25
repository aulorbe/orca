import { expect, it, vi } from 'vitest'
import { syncUpstream } from './sync-upstream.mjs'

function gitMock(branch = 'main', status = '') {
  return vi.fn((args) => (args[0] === 'branch' ? branch : args[0] === 'status' ? status : ''))
}
it('fetches and merges only on a clean main, without pushing or restarting anything', () => {
  const git = gitMock()
  syncUpstream(git)
  expect(git.mock.calls).toEqual([
    [['branch', '--show-current'], true],
    [['status', '--porcelain'], true],
    [['fetch', 'upstream']],
    [['merge', '--no-edit', 'upstream/main']]
  ])
})
it('refuses a dirty working tree or a different branch before fetching', () => {
  for (const git of [gitMock('feature'), gitMock('main', ' M file.ts')]) {
    expect(() => syncUpstream(git)).toThrow()
    expect(git.mock.calls.some(([args]) => args[0] === 'fetch')).toBe(false)
  }
})
it('stops on fetch failure without merging', () => {
  const git = gitMock()
  git.mockImplementation((args) => {
    if (args[0] === 'branch') {
      return 'main'
    }
    if (args[0] === 'fetch') {
      throw new Error('Fetch failed')
    }
    return ''
  })
  expect(() => syncUpstream(git)).toThrow('Fetch failed')
  expect(git.mock.calls.some(([args]) => args[0] === 'merge')).toBe(false)
})
