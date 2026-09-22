import type { Page } from '@stablyai/playwright-test'
import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

async function addTag(page: Page, name: string, color: string) {
  await page.getByRole('textbox', { name: 'New tag' }).fill(name)
  await page.getByRole('button', { name: 'Tag color', exact: true }).click()
  await page.getByRole('textbox', { name: 'Hex', exact: true }).fill(color)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
}

async function openTags(page: Page, worktreeId: string) {
  const title = worktreeRow(page, worktreeId).locator('[data-worktree-title-inline-rename]').first()
  const name = await title.innerText()
  await title.hover()
  const details = page
    .locator('[data-slot="hover-card-content"]')
    .filter({ has: page.getByText(name, { exact: true }) })
  await details.getByRole('button', { name: /^(Add|Edit) tags$/ }).click()
}

async function openTagFilter(page: Page) {
  await page.getByRole('button', { name: /^Workspace options/ }).click()
  await page.getByRole('menuitem', { name: /^Tags/ }).hover()
}

test('colored tag dots, tag filtering, removal, and reload persistence', async ({
  orcaPage: page
}, testInfo) => {
  const primaryId = await waitForActiveWorktree(page)
  const secondaryId = await page.evaluate(async (primaryId) => {
    const store = window.__store
    if (!store) {
      throw new Error('Store unavailable')
    }
    const state = store.getState()
    state.setShowSleepingWorkspaces(true)
    state.setHideDefaultBranchWorkspace(false)
    await state.updateSettings({ experimentalNewWorktreeCardStyle: true, theme: 'light' })
    const secondary = Object.values(state.worktreesByRepo)
      .flat()
      .find((worktree) => worktree.id !== primaryId)
    if (!secondary) {
      throw new Error('A second worktree is required')
    }
    return secondary.id
  }, primaryId)
  const primary = worktreeRow(page, primaryId)
  const secondary = worktreeRow(page, secondaryId)
  await expect(primary.getByRole('button', { name: /tags/i })).toHaveCount(0)
  await expect(primary.locator('[data-worktree-tags]')).toHaveCount(0)
  await openTags(page, primaryId)
  await addTag(page, 'Urgent', '#ef4444')
  await addTag(page, 'Review', '#3b82f6')
  await addTag(page, 'Duplicate', '#EF4444')
  await expect(page.getByRole('alert')).toContainText('hex color is already used')
  await expect(primary.getByRole('img', { name: 'Duplicate', exact: true })).toHaveCount(0)
  await addTag(page, 'Blocked', '#eab308')
  await expect(primary.locator('[data-worktree-tags] [role="img"]')).toHaveCount(3)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('textbox', { name: 'New tag' })).not.toBeVisible()
  await expect(primary.getByRole('img', { name: 'Urgent', exact: true })).toHaveCSS(
    'background-color',
    'rgb(239, 68, 68)'
  )
  await expect(primary.getByRole('img', { name: 'Review', exact: true })).toHaveCSS(
    'background-color',
    'rgb(59, 130, 246)'
  )
  await expect(primary.locator('[data-worktree-tags]')).toBeInViewport({ ratio: 1 })
  await primary.screenshot({ path: testInfo.outputPath('tag-dots-light.png') })
  await page.evaluate(async () => {
    await window.__store?.getState().updateSettings({ theme: 'dark' })
  })
  await primary.screenshot({ path: testInfo.outputPath('tag-dots-dark.png') })

  await openTags(page, secondaryId)
  await page.getByRole('checkbox', { name: 'Urgent', exact: true }).check()
  await page.keyboard.press('Escape')
  await expect(secondary.getByRole('img', { name: 'Urgent', exact: true })).toBeVisible()

  await openTagFilter(page)
  await page.getByRole('menuitemcheckbox', { name: 'Review', exact: true }).click()
  await expect(primary).toBeVisible()
  await expect(secondary).toHaveCount(0)
  await page.getByRole('menuitemcheckbox', { name: 'Urgent', exact: true }).click()
  await expect(secondary).toBeVisible()
  await page.getByRole('menuitemcheckbox', { name: 'Urgent', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  await page.reload()
  await waitForActiveWorktree(page)
  await expect(primary.getByRole('img', { name: 'Urgent', exact: true })).toBeVisible()
  await expect(primary.getByRole('img', { name: 'Review', exact: true })).toBeVisible()
  await expect(secondary).toHaveCount(0)
  await openTagFilter(page)
  await page.getByRole('menuitem', { name: 'Clear tag filter', exact: true }).click()
  await expect(secondary).toBeVisible()

  await openTags(page, primaryId)
  await page.getByRole('checkbox', { name: 'Urgent', exact: true }).uncheck()
  await page.keyboard.press('Escape')
  await expect(primary.getByRole('img', { name: 'Urgent', exact: true })).toHaveCount(0)
  await expect(primary.getByRole('img', { name: 'Review', exact: true })).toBeVisible()
  await expect(secondary.getByRole('img', { name: 'Urgent', exact: true })).toBeVisible()

  await openTags(page, primaryId)
  await page.getByRole('button', { name: 'Delete tag Urgent', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Delete tag “Urgent”?' })
  await expect(confirmation).toBeVisible()
  await expect(confirmation.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(secondary.getByRole('img', { name: 'Urgent', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Urgent', exact: true })).not.toBeChecked()
  await page.getByRole('button', { name: 'Delete tag Urgent', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Delete tag', exact: true }).click()
  await expect(confirmation).not.toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Urgent', exact: true })).toHaveCount(0)
  await expect(secondary.getByRole('img', { name: 'Urgent', exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Review', exact: true }).uncheck()
  await page.getByRole('checkbox', { name: 'Blocked', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Close tags', exact: true }).click()
  await expect(primary.locator('[data-worktree-tags]')).toHaveCount(0)
  await expect(primary.getByRole('button', { name: /tags/i })).toHaveCount(0)
  await primary.screenshot({ path: testInfo.outputPath('untagged-title.png') })

  for (const compact of [true, false]) {
    await page.evaluate(async (compact) => {
      await window.__store?.getState().updateSettings({
        experimentalNewWorktreeCardStyle: false,
        compactWorktreeCards: compact
      })
    }, compact)
    await expect(primary.getByRole('button', { name: /tags/i })).toHaveCount(0)
    await openTags(page, primaryId)
    await expect(page.getByRole('textbox', { name: 'New tag' })).toBeVisible()
    await page.getByRole('button', { name: 'Close tags', exact: true }).click()
  }
})
