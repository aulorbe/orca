import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

test('unread cards get a quiet highlight that clears when read without changing active selection', async ({
  orcaPage: page
}, testInfo) => {
  const activeId = await waitForActiveWorktree(page)
  const unreadId = await page.evaluate(async (activeId) => {
    const state = window.__store!.getState()
    state.setHideDefaultBranchWorkspace(false)
    state.setShowSleepingWorkspaces(true)
    await state.updateSettings({ experimentalNewWorktreeCardStyle: true, theme: 'light' })
    const other = Object.values(state.worktreesByRepo)
      .flat()
      .find((workspace) => workspace.id !== activeId)
    if (!other) {
      throw new Error('Second workspace missing')
    }
    return other.id
  }, activeId)
  const row = worktreeRow(page, unreadId)
  const surface = row.locator('[data-worktree-card-surface]')
  const active = worktreeRow(page, activeId).locator('[data-worktree-card-surface]')
  await expect(surface).not.toHaveAttribute('data-worktree-card-unread', 'true')
  await row.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Mark Unread', exact: true }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(surface).toHaveAttribute('data-worktree-card-unread', 'true')
  await expect(surface.locator('[data-worktree-sleeping-dim]')).toHaveCount(0)
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate(async (theme) => {
      await window.__store!.getState().updateSettings({ theme })
    }, theme)
    await page.mouse.move(800, 20)
    await expect(active).toHaveAttribute('data-worktree-card-active', 'primary')
    await expect(surface).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const selectedFill = await active.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    )
    await expect(surface).not.toHaveCSS('background-color', selectedFill)
    await page
      .getByRole('listbox', { name: 'Worktrees', exact: true })
      .screenshot({ path: testInfo.outputPath(`unread-highlight-${theme}.png`) })
  }
  await row.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Mark Read', exact: true }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await page.mouse.move(800, 20)
  await expect(surface).not.toHaveAttribute('data-worktree-card-unread', 'true')
  await expect(surface).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(active).toHaveAttribute('data-worktree-card-active', 'primary')
})
