import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

test.use({ minimumSeededWorktreeCount: 1 })

test('Blocked is a built-in sidebar status and board lane', async ({
  orcaPage: page
}, testInfo) => {
  const id = await waitForActiveWorktree(page)
  await page.evaluate(async () => {
    const state = window.__store!.getState()
    state.setHideDefaultBranchWorkspace(false)
    state.setShowSleepingWorkspaces(true)
    await state.updateSettings({ experimentalNewWorktreeCardStyle: true, theme: 'light' })
  })
  await page.getByRole('button', { name: /^Workspace options/ }).click()
  await page.getByText('Status', { exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  const blocked = page.getByRole('button', { name: 'Blocked', exact: true })
  await expect(blocked).toHaveAttribute('data-workspace-status', 'blocked')
  await expect(page.locator('[data-custom-group-key]')).toHaveCount(0)
  const card = worktreeRow(page, id)
  await card.locator('[data-worktree-card-surface]').hover()
  await page.mouse.down()
  try {
    await blocked.hover()
    await expect(page.locator('[data-worktree-sidebar-drag-preview="true"]')).toHaveCount(1)
  } finally {
    await page.mouse.up()
  }
  await expect(card).toHaveAttribute('data-worktree-section-key', 'workspace-status:blocked')
  await page
    .getByRole('listbox', { name: 'Worktrees', exact: true })
    .screenshot({ path: testInfo.outputPath('blocked-sidebar.png') })
  await page.reload()
  await waitForActiveWorktree(page)
  await expect(card).toHaveAttribute('data-worktree-section-key', 'workspace-status:blocked')
  await page.getByRole('button', { name: 'Workspace board', exact: true }).click()
  const lane = page.locator(
    '[data-workspace-board-selection-surface] [data-workspace-status="blocked"]'
  )
  await expect(lane).toContainText('Blocked')
  await expect(lane.locator('[data-workspace-board-worktree-id]')).toHaveAttribute(
    'data-workspace-board-worktree-id',
    id
  )
  await page.evaluate(async () => {
    await window.__store!.getState().updateSettings({ theme: 'dark' })
  })
  await lane.screenshot({ path: testInfo.outputPath('blocked-board-dark.png') })
})
