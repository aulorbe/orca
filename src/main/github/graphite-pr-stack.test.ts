import { beforeEach, expect, it, vi } from 'vitest'
import { stackComment } from '../../shared/github/graphite-stack-test-fixtures'
const mocks = vi.hoisted(() => ({
  exec: vi.fn(),
  guard: vi.fn(() => ({ blocked: false })),
  spend: vi.fn()
}))
vi.mock('../git/runner', () => ({ ghExecFileAsync: mocks.exec }))
vi.mock('./rate-limit', () => ({
  repositoryRateLimitGuard: mocks.guard,
  noteRepositoryRateLimitSpend: mocks.spend
}))
import { getGraphitePRStack, resetGraphiteStackCacheForTests } from './graphite-pr-stack'
const repo = { owner: 'acme', repo: 'widgets', host: 'github.com' }
const options = { cwd: '/repo' }

beforeEach(() => {
  vi.useRealTimers()
  resetGraphiteStackCacheForTests()
  mocks.guard.mockReturnValue({ blocked: false })
  mocks.exec.mockReset().mockImplementation(async (args: string[]) => ({
    stdout:
      args[1] === 'graphql'
        ? JSON.stringify({
            data: {
              repository: {
                p103: { title: 'UI layer', state: 'OPEN', isDraft: false },
                p102: { title: 'API layer', state: 'OPEN', isDraft: true },
                p101: { title: 'Shared types', state: 'MERGED', isDraft: false }
              }
            }
          })
        : JSON.stringify([
            {
              body: stackComment(),
              html_url: 'https://github.com/acme/widgets/pull/102#issuecomment-1',
              updated_at: '2026-09-01T00:00:00Z'
            }
          ]),
    stderr: ''
  }))
})

it('fetches the stack comment and all titles in two calls, then reuses it for sibling cards', async () => {
  const stack = await getGraphitePRStack(repo, 102, options, 'local:host')
  expect(stack?.entries.map((entry) => [entry.number, entry.title, entry.state])).toEqual([
    [103, 'UI layer', 'open'],
    [102, 'API layer', 'draft'],
    [101, 'Shared types', 'merged']
  ])
  expect(mocks.exec).toHaveBeenCalledTimes(2)
  expect(await getGraphitePRStack(repo, 101, options, 'local:host')).toEqual(stack)
  expect(mocks.exec).toHaveBeenCalledTimes(2)
})
it('coalesces concurrent requests and isolates execution hosts and authentication contexts', async () => {
  await Promise.all([
    getGraphitePRStack(repo, 102, options, 'local:host'),
    getGraphitePRStack(repo, 102, options, 'local:host')
  ])
  expect(mocks.exec).toHaveBeenCalledTimes(2)
  await getGraphitePRStack(repo, 102, options, 'ssh:box')
  await getGraphitePRStack(
    repo,
    102,
    { ...options, env: { GH_TOKEN: 'different-test-account' } },
    'local:host'
  )
  expect(mocks.exec).toHaveBeenCalledTimes(6)
})
it('does not fetch titles for one-off PRs or call Graphite for enterprise hosts', async () => {
  mocks.exec.mockResolvedValue({ stdout: '[]', stderr: '' })
  expect(await getGraphitePRStack(repo, 102, options, 'local:host')).toBeUndefined()
  expect(mocks.exec).toHaveBeenCalledTimes(1)
  expect(
    await getGraphitePRStack({ ...repo, host: 'github.corp.test' }, 102, options, 'local:host')
  ).toBeUndefined()
  expect(mocks.exec).toHaveBeenCalledTimes(1)
})
it('retains last-known membership on failures and honors rate limits', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000)
  await getGraphitePRStack(repo, 102, options, 'local:host')
  vi.spyOn(Date, 'now').mockReturnValue(130000)
  mocks.exec.mockRejectedValue(new Error('Offline'))
  expect(await getGraphitePRStack(repo, 102, options, 'local:host')).toMatchObject({ stale: true })
  mocks.guard.mockReturnValue({ blocked: true })
  const before = mocks.exec.mock.calls.length
  expect(await getGraphitePRStack(repo, 999, options, 'local:host')).toBeUndefined()
  expect(mocks.exec).toHaveBeenCalledTimes(before)
  vi.restoreAllMocks()
})
it('keeps verified PR numbers when a title lookup fails instead of hiding the stack', async () => {
  mocks.exec
    .mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          body: stackComment(),
          html_url: 'https://github.com/acme/widgets/pull/102#issuecomment-1',
          updated_at: 'now'
        }
      ]),
      stderr: ''
    })
    .mockRejectedValueOnce(new Error('Rate limited'))
  expect(
    (await getGraphitePRStack(repo, 102, options, 'local:host'))?.entries.map(
      (entry) => entry.title
    )
  ).toEqual([null, null, null])
})
