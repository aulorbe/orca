import { parseGitHubIssueOrPRLink } from './github/links'

/** Navigation only: provider URLs used for GitHub API calls stay canonical. */
export function preferredReviewUrl(rawUrl: string): string {
  const link = parseGitHubIssueOrPRLink(rawUrl)
  if (
    link?.type !== 'pr' ||
    !['github.com', 'www.github.com'].includes(link.slug.host ?? '') ||
    !Number.isSafeInteger(link.number)
  ) {
    return rawUrl
  }
  try {
    const owner = encodeURIComponent(decodeURIComponent(link.slug.owner))
    const repo = encodeURIComponent(decodeURIComponent(link.slug.repo))
    return `https://app.graphite.com/github/pr/${owner}/${repo}/${link.number}`
  } catch {
    return rawUrl
  }
}

export function preferredReviewBrowserName(url: string | undefined, fallback: string): string {
  return url && preferredReviewUrl(url) !== url ? 'Graphite' : fallback
}
