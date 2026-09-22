import type { Page } from '@stablyai/playwright-test'
import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

async function options(page: Page) {
  await page.getByRole('button', { name: /^Workspace options/ }).click()
}
async function manager(page: Page) {
  await options(page)
  await page.getByRole('menuitem', { name: /^Manage custom groups/ }).click()
  return page.getByRole('dialog', { name: 'Custom groups', exact: true })
}
async function assign(page: Page, workspaceId: string, group: string) {
  const title = worktreeRow(page, workspaceId)
    .locator('[data-worktree-title-inline-rename]')
    .first()
  const name = await title.innerText()
  await title.hover()
  const details = page
    .locator('[data-slot="hover-card-content"]')
    .filter({ has: page.getByText(name, { exact: true }) })
  await details.getByRole('combobox', { name: 'Custom group', exact: true }).click()
  await page.getByRole('option', { name: group, exact: true }).click()
}
async function groupKey(page: Page, name: string): Promise<string> {
  const key = await page
    .getByRole('button', { name, exact: true })
    .getAttribute('data-custom-group-key')
  if (!key) {
    throw new Error(`Missing custom group: ${name}`)
  }
  return key
}

test('one set of custom groups supports assignment, ordering, rename, collapse, reload, and deletion', async ({
  orcaPage: page
}, testInfo) => {
  const primaryId = await waitForActiveWorktree(page)
  const secondaryId = await page.evaluate(async (primaryId) => {
    const state = window.__store?.getState()
    if (!state) {
      throw new Error('Store unavailable')
    }
    state.setShowSleepingWorkspaces(true)
    state.setHideDefaultBranchWorkspace(false)
    await state.updateSettings({ experimentalNewWorktreeCardStyle: true, theme: 'light' })
    const secondary = Object.values(state.worktreesByRepo)
      .flat()
      .find((workspace) => workspace.id !== primaryId)
    if (!secondary) {
      throw new Error('Second workspace missing')
    }
    return secondary.id
  }, primaryId)
  const primary = worktreeRow(page, primaryId)
  const secondary = worktreeRow(page, secondaryId)

  await options(page)
  await page.getByText('Custom', { exact: true }).click()
  await page.getByRole('menuitem', { name: /^Manage custom groups/ }).click()
  let dialog = page.getByRole('dialog', { name: 'Custom groups', exact: true })
  for (const name of ['Frontend', 'Infrastructure']) {
    await dialog.getByRole('textbox', { name: 'New group', exact: true }).fill(name)
    await dialog.getByRole('button', { name: 'Add group', exact: true }).click()
  }
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(primary).toHaveAttribute('data-worktree-section-key', 'custom-group:ungrouped')

  const frontendKey = await groupKey(page, 'Frontend')
  const infraKey = await groupKey(page, 'Infrastructure')
  await assign(page, primaryId, 'Frontend')
  await assign(page, secondaryId, 'Infrastructure')
  await expect(primary).toHaveAttribute('data-worktree-section-key', frontendKey)
  await expect(secondary).toHaveAttribute('data-worktree-section-key', infraKey)
  await expect(primary).toHaveAttribute('aria-current', 'page')

  await page.getByRole('button', { name: 'Frontend', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Frontend', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false'
  )
  // The active card keeps an accessibility placeholder even while its group is collapsed.
  await expect(primary.locator('[data-worktree-card-surface]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Reveal active workspace', exact: true }).click()
  await expect(primary.locator('[data-worktree-card-surface]')).toBeVisible()

  dialog = await manager(page)
  await dialog.getByRole('button', { name: 'Rename Frontend', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Rename group', exact: true }).fill('Web')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await dialog.getByRole('button', { name: 'Move Infrastructure up', exact: true }).click()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.locator('[data-custom-group-key]')).toHaveText(['Infrastructure', 'Web'])
  await expect(primary).toHaveAttribute('data-worktree-section-key', frontendKey)
  await page
    .getByRole('listbox', { name: 'Worktrees', exact: true })
    .screenshot({ path: testInfo.outputPath('custom-groups-light.png') })

  await page.reload()
  await waitForActiveWorktree(page)
  await expect(page.locator('[data-custom-group-key]')).toHaveText(['Infrastructure', 'Web'])
  await expect(primary).toHaveAttribute('data-worktree-section-key', frontendKey)
  await expect(secondary).toHaveAttribute('data-worktree-section-key', infraKey)
  await page.evaluate(async () => {
    await window.__store?.getState().updateSettings({ theme: 'dark' })
  })
  await page
    .getByRole('listbox', { name: 'Worktrees', exact: true })
    .screenshot({ path: testInfo.outputPath('custom-groups-dark.png') })

  dialog = await manager(page)
  await dialog.getByRole('button', { name: 'Delete group Web', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Delete group “Web”?', exact: true })
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Rename Web', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete group Web', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Delete group', exact: true }).click()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(primary).toHaveAttribute('data-worktree-section-key', 'custom-group:ungrouped')
  await expect(secondary).toHaveAttribute('data-worktree-section-key', infraKey)

  await options(page)
  await page.getByText('Project', { exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-custom-group-key]')).toHaveCount(0)
  await expect(primary).toBeVisible()
  await expect(secondary).toBeVisible()
})
