// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { HostedReviewInfo } from '../../../../shared/hosted-review'
import { hostedReviewInfoFromGitHubPRInfo } from '../../../../shared/hosted-review-github'
import { GraphiteStackBadge, GraphiteStackDetails } from './GraphiteStackDetails'

const review: HostedReviewInfo = {
  provider: 'github',
  number: 102,
  title: 'API layer',
  state: 'open',
  url: 'https://github.com/acme/widgets/pull/102',
  status: 'neutral',
  updatedAt: '',
  mergeable: 'UNKNOWN',
  graphiteStack: {
    commentUrl: 'https://github.com/acme/widgets/pull/102#issuecomment-1',
    entries: [
      {
        number: 103,
        title: 'UI layer',
        url: 'https://app.graphite.com/github/pr/acme/widgets/103'
      },
      {
        number: 102,
        title: 'API layer',
        url: 'https://app.graphite.com/github/pr/acme/widgets/102'
      },
      {
        number: 101,
        title: 'Shared types',
        url: 'https://app.graphite.com/github/pr/acme/widgets/101'
      }
    ]
  }
}
it('shows the stack indicator, full titles, published order, and the current PR', () => {
  expect(renderToStaticMarkup(<GraphiteStackBadge review={review} />)).toContain(
    'Graphite stack: 3 PRs'
  )
  const markup = renderToStaticMarkup(<GraphiteStackDetails review={review} />)
  expect(markup).toContain('UI layer')
  expect(markup).toContain('API layer')
  expect(markup).toContain('Shared types')
  expect(markup).toContain('This PR')
  expect(markup.indexOf('#103')).toBeLessThan(markup.indexOf('#101'))
  expect(markup).toContain('aria-current="true"')
})
it('leaves one-off, mismatched, and non-GitHub reviews uncluttered', () => {
  expect(
    renderToStaticMarkup(<GraphiteStackBadge review={{ ...review, graphiteStack: undefined }} />)
  ).toBe('')
  expect(renderToStaticMarkup(<GraphiteStackBadge review={{ ...review, number: 999 }} />)).toBe('')
  expect(
    renderToStaticMarkup(<GraphiteStackBadge review={{ ...review, provider: 'gitlab' }} />)
  ).toBe('')
})
it('carries Graphite metadata through the existing GitHub-to-review conversion', () => {
  const mapped = hostedReviewInfoFromGitHubPRInfo({ ...review, checksStatus: 'neutral' })
  expect(mapped.graphiteStack).toEqual(review.graphiteStack)
})
