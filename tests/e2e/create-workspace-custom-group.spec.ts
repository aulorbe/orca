import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { openSidebarWorkspaceComposer } from './helpers/sidebar-project-dialog'

test.use({ minimumSeededWorktreeCount: 1 })

for (const source of ['manual', 'PR'] as const) {
  test(`chooses a custom group before creating a ${source} worktree`, async ({
    orcaPage: page,
    electronApp
  }, testInfo) => {
    await waitForActiveWorktree(page)
    await page.evaluate(async () => {
      const state = window.__store!.getState()
      state.setShowSleepingWorkspaces(true)
      state.setHideDefaultBranchWorkspace(false)
      await state.updateSettings({
        experimentalNewWorktreeCardStyle: true,
        defaultTuiAgent: 'blank'
      })
    })
    await page.getByRole('button', { name: /^Workspace options/ }).click()
    await page.getByText('Custom', { exact: true }).click()
    await page.getByRole('menuitem', { name: /^Manage custom groups/ }).click()
    const manager = page.getByRole('dialog', { name: 'Custom groups', exact: true })
    await manager.getByRole('textbox', { name: 'New group', exact: true }).fill('Feature work')
    await manager.getByRole('button', { name: 'Add group', exact: true }).click()
    await manager.getByRole('button', { name: 'Close', exact: true }).click()
    const groupKey = await page
      .getByRole('button', { name: 'Feature work', exact: true })
      .getAttribute('data-custom-group-key')
    if (!groupKey) {
      throw new Error('Custom group missing')
    }

    const title = source === 'manual' ? 'manual-group-choice' : 'Fix grouped review'
    const url = 'https://github.com/stablyai/orca/pull/4242'
    if (source === 'PR') {
      await electronApp.evaluate(
        ({ ipcMain }, { title, url }) => {
          ipcMain.removeHandler('gh:workItemByOwnerRepo')
          ipcMain.handle(
            'gh:workItemByOwnerRepo',
            (_event: unknown, args: { number: number; repoId?: string }) => ({
              id: 'pr-4242',
              provider: 'github',
              type: 'pr',
              number: args.number,
              title,
              state: 'open',
              url,
              labels: [],
              updatedAt: '2026-09-01T00:00:00Z',
              author: 'e2e',
              repoId: args.repoId
            })
          )
          ipcMain.removeHandler('worktrees:resolvePrBase')
          ipcMain.handle('worktrees:resolvePrBase', () => ({ baseBranch: 'HEAD' }))
        },
        { title, url }
      )
    }

    await openSidebarWorkspaceComposer(page)
    const dialog = page.getByRole('dialog', { name: /Create (Workspace|Worktree)/i })
    const picker = dialog.getByRole('combobox', { name: 'Custom group', exact: true })
    await expect(picker).toContainText('Ungrouped')
    await dialog.locator('[data-workspace-name-input="true"]').fill(source === 'PR' ? url : title)
    if (source === 'PR') {
      await page.getByRole('option', { name: new RegExp(title) }).click()
      await expect(dialog.locator('[data-workspace-source-pill="true"]')).toContainText(title)
    }
    await picker.click()
    await page.getByRole('option', { name: 'Feature work', exact: true }).click()
    await dialog.screenshot({ path: testInfo.outputPath(`create-${source}-group-picker.png`) })
    await dialog.getByRole('button', { name: /^Create (Workspace|Worktree)/i }).click()
    await expect(dialog).toBeHidden()
    const card = page
      .locator('[data-worktree-section-key]')
      .filter({ has: page.locator('[data-worktree-title-inline-rename]', { hasText: title }) })
      .first()
    await expect(card).toHaveAttribute('data-worktree-section-key', groupKey, { timeout: 20000 })
    await expect(card).toHaveAttribute('aria-current', 'page')
    await page.reload()
    await waitForActiveWorktree(page)
    await expect(card).toHaveAttribute('data-worktree-section-key', groupKey)
  })
}
