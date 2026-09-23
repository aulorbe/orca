import { translate } from '@/i18n/i18n'
import { preferredReviewBrowserName } from '../../../shared/preferred-review-url'

export function reviewBrowserLinkLabel(url: string, provider = 'GitHub'): string {
  const destination = preferredReviewBrowserName(url, provider)
  return destination === 'Graphite'
    ? translate('custom.review.openInGraphite', 'Open in Graphite')
    : translate('custom.review.openOnProvider', 'Open on {{provider}}', { provider: destination })
}
