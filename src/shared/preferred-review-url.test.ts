import { describe, expect, it } from 'vitest'
import { preferredReviewUrl, preferredReviewBrowserName } from './preferred-review-url'

describe('preferred PR navigation', () => {
  it.each([
    'https://github.com/acme/repo/pull/42',
    'https://github.com/acme/repo/pull/42/files',
    'https://github.com/acme/repo/pull/42?token=private#discussion_r123',
    'https://www.github.com/acme/repo/pull/42/'
  ])('opens the corresponding PR in Graphite: %s', (url) => {
    expect(preferredReviewUrl(url)).toBe('https://app.graphite.com/github/pr/acme/repo/42')
    expect(preferredReviewBrowserName(url, 'GitHub')).toBe('Graphite')
  })

  it.each([
    'https://github.com/acme/repo/issues/42',
    'https://github.com/acme/repo',
    'https://github.example.com/acme/repo/pull/42',
    'https://gitlab.com/acme/repo/-/merge_requests/42',
    'https://app.graphite.com/github/pr/acme/repo/42',
    'https://github.com/login/oauth/authorize',
    'https://api.github.com/repos/acme/repo/pulls/42',
    'https://github.com.evil.example/acme/repo/pull/42',
    'not a URL',
    'javascript:alert(1)'
  ])('leaves other destinations unchanged: %s', (url) => {
    expect(preferredReviewUrl(url)).toBe(url)
  })
})
