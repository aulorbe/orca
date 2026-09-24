import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  parseGraphiteStackComment,
  type GraphiteStack,
  type GraphiteStackEntry
} from '../../shared/github/graphite-stack'
import {
  githubRepoIdentityKey,
  isDefaultGitHubHost
} from '../../shared/github/repository-identity-key'
import { ghExecFileAsync } from '../git/runner'
import {
  githubHostExecOptions,
  type GitHubApiRepository,
  type GitHubRepoExecOptions
} from './github-api-repository'
import { noteRepositoryRateLimitSpend, repositoryRateLimitGuard } from './rate-limit'

const TTL_MS = 120_000
const MAX_ENTRIES = 512
const commentsSchema = z.array(
  z.object({ body: z.string(), html_url: z.string(), updated_at: z.string() })
)
const detailsSchema = z.object({ title: z.string(), state: z.string(), isDraft: z.boolean() })
const responseSchema = z.object({
  data: z.object({ repository: z.record(z.string(), z.unknown()).nullable() })
})
type CacheEntry = { value: GraphiteStack | null; expiresAt: number }
const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<GraphiteStack | null | undefined>>()
const titleRequests = new Map<string, Promise<GraphiteStackEntry[]>>()

function scopeKey(
  repo: GitHubApiRepository,
  options: GitHubRepoExecOptions,
  executionScope: string
): string {
  const auth =
    options.env?.GH_TOKEN ?? options.env?.GITHUB_TOKEN ?? options.env?.GH_CONFIG_DIR ?? 'ambient'
  return `${executionScope}\0${githubRepoIdentityKey(repo)}\0${createHash('sha256').update(auth).digest('hex')}`
}
function remember(key: string, value: GraphiteStack | null, ttl = TTL_MS): void {
  cache.delete(key)
  cache.set(key, { value, expiresAt: Date.now() + ttl })
  while (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value!)
  }
}

async function fetchTitles(
  repo: GitHubApiRepository,
  numbers: number[],
  options: GitHubRepoExecOptions
): Promise<GraphiteStackEntry[]> {
  const entries = numbers.map((number) => ({
    number,
    title: null,
    url: `https://app.graphite.com/github/pr/${repo.owner}/${repo.repo}/${number}`
  }))
  if (repositoryRateLimitGuard(repo, 'graphql', options).blocked) {
    return entries
  }
  const fields = numbers
    .map((number) => `p${number}: pullRequest(number: ${number}) { title state isDraft }`)
    .join('\n')
  noteRepositoryRateLimitSpend(repo, 'graphql', 1, options)
  try {
    const { stdout } = await ghExecFileAsync(
      [
        'api',
        'graphql',
        '-f',
        `query=query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){${fields}}}`,
        '-f',
        `owner=${repo.owner}`,
        '-f',
        `repo=${repo.repo}`
      ],
      { ...options, ...githubHostExecOptions(repo), timeout: 5_000 }
    )
    const response = responseSchema.parse(JSON.parse(stdout))
    return entries.map((entry): GraphiteStackEntry => {
      const result = detailsSchema.safeParse(response.data.repository?.[`p${entry.number}`])
      if (!result.success) {
        return entry
      }
      return {
        ...entry,
        title: result.data.title,
        state:
          result.data.state === 'MERGED'
            ? 'merged'
            : result.data.state === 'CLOSED'
              ? 'closed'
              : result.data.isDraft
                ? 'draft'
                : 'open'
      }
    })
  } catch {
    return entries
  }
}

async function loadStack(
  repo: GitHubApiRepository,
  number: number,
  options: GitHubRepoExecOptions,
  scope: string
): Promise<GraphiteStack | null> {
  if (repositoryRateLimitGuard(repo, 'core', options).blocked) {
    throw new Error('Rate limited')
  }
  // Graphite publishes a top-level conversation comment; review threads are unrelated and expensive.
  noteRepositoryRateLimitSpend(repo, 'core', 1, options)
  const { stdout } = await ghExecFileAsync(
    [
      'api',
      '--cache',
      '60s',
      `repos/${repo.owner}/${repo.repo}/issues/${number}/comments?per_page=100`
    ],
    { ...options, ...githubHostExecOptions(repo), timeout: 5_000 }
  )
  const comments = commentsSchema
    .parse(JSON.parse(stdout))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  for (const comment of comments) {
    const numbers = parseGraphiteStackComment(comment.body, repo, number)
    if (!numbers) {
      continue
    }
    const key = `${scope}\0members:${numbers.join(',')}`
    const known = cache.get(key)
    if (known?.value && known.expiresAt > Date.now()) {
      return { ...known.value, commentUrl: comment.html_url }
    }
    let request = titleRequests.get(key)
    if (!request) {
      request = fetchTitles(repo, numbers, options)
      titleRequests.set(key, request)
    }
    try {
      const value = { entries: await request, commentUrl: comment.html_url }
      remember(key, value)
      return value
    } finally {
      if (titleRequests.get(key) === request) {
        titleRequests.delete(key)
      }
    }
  }
  return null
}

/** Additive read-only metadata; failures must not blank the PR's own status. */
export async function getGraphitePRStack(
  repo: GitHubApiRepository,
  number: number,
  options: GitHubRepoExecOptions,
  executionScope: string
): Promise<GraphiteStack | undefined> {
  if (!isDefaultGitHubHost(repo.host)) {
    return undefined
  }
  const scope = scopeKey(repo, options, executionScope)
  const key = `${scope}\0${number}`
  const previous = cache.get(key)
  if (previous && previous.expiresAt > Date.now()) {
    return previous.value ?? undefined
  }
  const pending = inFlight.get(key)
  if (pending) {
    return (await pending) ?? undefined
  }
  const request = loadStack(repo, number, options, scope)
    .then((value) => {
      remember(key, value)
      // The same published stack can satisfy sibling worktrees without another API walk.
      if (value) {
        for (const entry of value.entries) {
          remember(`${scope}\0${entry.number}`, value)
        }
      }
      return value
    })
    .catch(() => {
      const stale = previous?.value ? { ...previous.value, stale: true } : null
      remember(key, stale, 15_000)
      return stale
    })
  inFlight.set(key, request)
  try {
    return (await request) ?? undefined
  } finally {
    if (inFlight.get(key) === request) {
      inFlight.delete(key)
    }
  }
}

export function resetGraphiteStackCacheForTests(): void {
  cache.clear()
  inFlight.clear()
  titleRequests.clear()
}
