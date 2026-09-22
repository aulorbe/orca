import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

const longTitle = 'Keep the pull request number readable even when the workspace title is very long'

test('worktree review numbers remain visible in narrow compact and detailed cards', async ({
  orcaPage
}, testInfo) => {
  const worktreeId = await waitForActiveWorktree(orcaPage)
  await orcaPage.evaluate(
    async ({ worktreeId, longTitle }) => {
      const store = window.__store
      if (!store) {
        throw new Error('Store unavailable')
      }
      await store.getState().updateWorktreeMeta(worktreeId, {
        displayName: longTitle,
        linkedPR: 12345
      })
      store.getState().setSidebarWidth(220)
    },
    { worktreeId, longTitle }
  )

  const row = worktreeRow(orcaPage, worktreeId)
  const number = row.locator('[data-worktree-review-number]')
  const title = row.locator('[data-worktree-title-inline-rename]').first()
  for (const newCardStyle of [false, true]) {
    for (const compact of [false, true]) {
      for (const theme of ['light', 'dark'] as const) {
        await orcaPage.evaluate(
          async ({ newCardStyle, compact, theme }) => {
            const store = window.__store
            if (!store) {
              throw new Error('Store unavailable')
            }
            await store.getState().updateSettings({
              experimentalNewWorktreeCardStyle: newCardStyle,
              compactWorktreeCards: compact,
              theme
            })
          },
          { newCardStyle, compact, theme }
        )
        await expect(number).toHaveText('PR #12345')
        await expect(number).toBeInViewport({ ratio: 1 })
        await expect(title).toHaveText(longTitle)
        const titleBox = await title.boundingBox()
        const numberBox = await number.boundingBox()
        const rowBox = await row.boundingBox()
        expect(titleBox).not.toBeNull()
        expect(numberBox).not.toBeNull()
        expect(rowBox).not.toBeNull()
        if (titleBox && numberBox && rowBox) {
          expect(titleBox.width).toBeGreaterThan(0)
          expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(numberBox.x)
          expect(numberBox.x + numberBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width)
        }
        expect(await number.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
        await row.screenshot({
          path: testInfo.outputPath(
            `review-number-${newCardStyle ? 'new' : 'legacy'}-${compact ? 'compact' : 'detailed'}-${theme}.png`
          )
        })
      }
    }
  }

  await orcaPage.evaluate(async (worktreeId) => {
    const store = window.__store
    if (!store) {
      throw new Error('Store unavailable')
    }
    await store.getState().updateWorktreeMeta(worktreeId, { linkedPR: null })
  }, worktreeId)
  await expect(number).toHaveCount(0)
  await expect(title).toHaveText(longTitle)
})
