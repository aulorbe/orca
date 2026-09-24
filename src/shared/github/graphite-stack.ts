import type { GitHubRepositoryIdentity, PRState } from './pull-request-types'

export type GraphiteStackEntry = {
  number: number
  title: string | null
  url: string
  state?: PRState
}
export type GraphiteStack = {
  /** Graphite's published order: top of stack first, base PR last. */
  entries: GraphiteStackEntry[]
  commentUrl: string
  stale?: boolean
}

/** Read only Graphite's generated stack comment, never arbitrary PR references or HTML. */
export function parseGraphiteStackComment(
  body: string,
  repository: GitHubRepositoryIdentity,
  currentNumber: number
): number[] | null {
  if (
    body.length > 100_000 ||
    !body.includes('This stack of pull requests is managed by') ||
    !body.includes('<!-- Current dependencies on/for this PR: -->')
  ) {
    return null
  }
  const numbers: number[] = []
  for (const line of body.split('\n')) {
    const match = /^\s*[*-]\s+\*\*#(\d+)\*\*\s+<a\s+href=["']([^"']+)["']/i.exec(line)
    if (!match) {
      continue
    }
    try {
      const url = new URL(match[2]!)
      const parts = url.pathname.split('/').filter(Boolean)
      const number = Number(match[1])
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'app.graphite.com' ||
        url.username ||
        url.password ||
        url.port ||
        parts.length !== 5 ||
        parts[0] !== 'github' ||
        parts[1] !== 'pr' ||
        parts[2]?.toLowerCase() !== repository.owner.toLowerCase() ||
        parts[3]?.toLowerCase() !== repository.repo.toLowerCase() ||
        Number(parts[4]) !== number ||
        !Number.isSafeInteger(number) ||
        number <= 0
      ) {
        return null
      }
      if (numbers.includes(number)) {
        return null
      }
      numbers.push(number)
      if (numbers.length > 100) {
        return null
      }
    } catch {
      return null
    }
  }
  return numbers.length > 1 && numbers.includes(currentNumber) ? numbers : null
}
