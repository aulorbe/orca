import type { Locator, Page } from '@stablyai/playwright-test'
import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

test.beforeEach(async ({ orcaPage }) => {
  // Keep FLIP transitions from moving a card between hover and pointerdown.
  await orcaPage.emulateMedia({ reducedMotion: 'reduce' })
})

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

async function dragCard(page: Page, workspaceId: string, group: string | Locator, cancel = false) {
  const row = worktreeRow(page, workspaceId)
  await row.locator('[data-worktree-card-surface]').hover()
  const target =
    typeof group === 'string' ? page.getByRole('button', { name: group, exact: true }) : group
  await page.mouse.down()
  try {
    await target.hover()
    await expect(
      page.locator('[data-worktree-sidebar-drag-preview="true"] [data-worktree-id]').first()
    ).toHaveAttribute('data-worktree-id', workspaceId)
    await expect(target).toHaveAttribute('data-custom-group-drop-hover', 'true')
    if (cancel) {
      await page.keyboard.press('Escape')
    }
  } finally {
    await page.mouse.up()
  }
  await expect(page.locator('[data-custom-group-drop-hover]')).toHaveCount(0)
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

  await page
    .getByRole('button', { name: 'Frontend', exact: true })
    .locator('[data-repo-header-collapse-affordance]')
    .click()
  await expect(page.getByRole('button', { name: 'Frontend', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false'
  )
  // The active card keeps an accessibility placeholder even while its group is collapsed.
  await expect(primary.locator('[data-worktree-card-surface]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Reveal active workspace', exact: true }).click()
  await expect(primary.locator('[data-worktree-card-surface]')).toBeVisible()

  await page
    .getByRole('button', { name: 'Frontend', exact: true })
    .locator('[data-worktree-title-inline-rename]')
    .dblclick()
  await page.getByRole('textbox', { name: 'Rename group', exact: true }).fill('Frontend renamed')
  await page.getByRole('textbox', { name: 'Rename group', exact: true }).press('Enter')
  await page
    .getByRole('button', { name: 'Frontend renamed', exact: true })
    .locator('[data-worktree-title-inline-rename]')
    .click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('textbox', { name: 'Rename group', exact: true }).fill('Frontend')
  await page.getByRole('textbox', { name: 'Rename group', exact: true }).press('Enter')

  await dragCard(page, secondaryId, 'Frontend')
  await expect(secondary).toHaveAttribute('data-worktree-section-key', frontendKey)
  await dragCard(page, secondaryId, 'Ungrouped')
  await expect(secondary).toHaveAttribute('data-worktree-section-key', 'custom-group:ungrouped')
  await dragCard(page, secondaryId, 'Infrastructure')
  await expect(secondary).toHaveAttribute('data-worktree-section-key', infraKey)

  dialog = await manager(page)
  await dialog.getByRole('button', { name: 'Rename Frontend', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Rename group', exact: true }).fill('Web')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await dialog.getByRole('button', { name: 'Move Infrastructure up', exact: true }).click()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.locator('[data-custom-group-key]')).toHaveText([
    'Infrastructure',
    'Web',
    'Ungrouped'
  ])
  await expect(primary).toHaveAttribute('data-worktree-section-key', frontendKey)
  await page
    .getByRole('listbox', { name: 'Worktrees', exact: true })
    .screenshot({ path: testInfo.outputPath('custom-groups-light.png') })

  await page.reload()
  await waitForActiveWorktree(page)
  await expect(page.locator('[data-custom-group-key]')).toHaveText([
    'Infrastructure',
    'Web',
    'Ungrouped'
  ])
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
  await confirmation.getByRole('combobox', { name: 'Move cards to', exact: true }).click()
  await page.getByRole('option', { name: 'Infrastructure', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Delete group', exact: true }).click()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(primary).toHaveAttribute('data-worktree-section-key', infraKey)
  await expect(secondary).toHaveAttribute('data-worktree-section-key', infraKey)
  await assign(page, primaryId, 'Ungrouped')

  for (const cancel of [true, false]) {
    dialog = await manager(page)
    await dialog.getByRole('button', { name: 'Delete group Infrastructure', exact: true }).click()
    const groupConfirmation = page.getByRole('dialog', {
      name: 'Delete group “Infrastructure”?',
      exact: true
    })
    await groupConfirmation
      .getByRole('combobox', { name: 'What happens to the cards?', exact: true })
      .click()
    await page.getByRole('option', { name: 'Delete workspaces too', exact: true }).click()
    await groupConfirmation
      .getByRole('button', { name: 'Review workspace deletion…', exact: true })
      .click()
    await expect(page.getByRole('button', { name: 'Delete Workspace', exact: true })).toBeVisible()
    if (cancel) {
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(secondary.locator('[data-worktree-card-surface]')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Infrastructure', exact: true })).toBeVisible()
    } else {
      await page.getByRole('button', { name: 'Delete Workspace', exact: true }).click()
      await expect(secondary.locator('[data-worktree-card-surface]')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Infrastructure', exact: true })).toHaveCount(0)
    }
  }

  await options(page)
  await page.getByText('Project', { exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-custom-group-key]')).toHaveCount(0)
  await expect(primary).toBeVisible()
  await expect(secondary.locator('[data-worktree-card-surface]')).toHaveCount(0)
})

test.describe('Status subgroups', () => {
  test.use({ minimumSeededWorktreeCount: 1 })

  test('status subgroups preserve status within a lane and update it across lanes', async ({
    orcaPage: page
  }, testInfo) => {
    const id = await waitForActiveWorktree(page)
    await page.evaluate(async (id) => {
      const state = window.__store!.getState()
      state.setShowSleepingWorkspaces(true)
      state.setHideDefaultBranchWorkspace(false)
      await state.updateSettings({ experimentalNewWorktreeCardStyle: true, theme: 'light' })
      await state.updateWorktreeMeta(id, { workspaceStatus: 'in-progress' })
    }, id)
    const card = worktreeRow(page, id)
    await options(page)
    await page.getByText('Status', { exact: true }).click()
    await page.keyboard.press('Escape')
    const progress = page.locator(
      '[role="button"][data-workspace-status-drop-target][data-workspace-status="in-progress"]'
    )
    await expect(page.getByRole('menu')).toHaveCount(0)
    await progress.hover()
    await progress.getByRole('button', { name: /Add custom subgroup/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Custom groups', exact: true })
    for (const name of ['Frontend', 'Infrastructure']) {
      await dialog.getByRole('textbox', { name: 'New group', exact: true }).fill(name)
      await dialog.getByRole('button', { name: 'Add group', exact: true }).click()
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    const front = page
      .locator('[data-custom-group-key^="custom-group:status/in-progress/"]')
      .filter({ hasText: 'Frontend' })
    const frontKey = await front.getAttribute('data-custom-group-key')
    if (!frontKey) {
      throw new Error('Frontend subgroup missing')
    }
    const reviewKey = frontKey.replace('/in-progress/', '/in-review/')
    const reviewFront = page.locator(`[data-custom-group-key="${reviewKey}"]`)
    await dragCard(page, id, front)
    await expect(card).toHaveAttribute('data-worktree-section-key', frontKey)
    await dragCard(page, id, reviewFront, true)
    await expect(card).toHaveAttribute('data-worktree-section-key', frontKey)
    await dragCard(page, id, reviewFront)
    await expect(card).toHaveAttribute('data-worktree-section-key', reviewKey)

    await options(page)
    await page.getByRole('menuitemcheckbox', { name: 'Custom subgroups', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(card).toHaveAttribute('data-worktree-section-key', 'workspace-status:in-review')
    await options(page)
    await page.getByRole('menuitemcheckbox', { name: 'Custom subgroups', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(card).toHaveAttribute('data-worktree-section-key', reviewKey)

    await reviewFront.hover()
    await reviewFront.locator('[data-repo-header-collapse-affordance]').click()
    const review = page.locator(
      '[role="button"][data-workspace-status-drop-target][data-workspace-status="in-review"]'
    )
    await review.hover()
    await review.locator('[data-repo-header-collapse-affordance]').click()
    await expect(card.locator('[data-worktree-card-surface]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Reveal active workspace', exact: true }).click()
    await expect(card.locator('[data-worktree-card-surface]')).toBeVisible()
    await reviewFront.locator('[data-worktree-title-inline-rename]').dblclick()
    await page.getByRole('textbox', { name: 'Rename group', exact: true }).fill('UI')
    await page.getByRole('textbox', { name: 'Rename group', exact: true }).press('Enter')
    await expect(front).toHaveCount(0)
    await expect(page.locator(`[data-custom-group-key="${frontKey}"]`)).toHaveText('UI')
    await page
      .getByRole('listbox', { name: 'Worktrees', exact: true })
      .screenshot({ path: testInfo.outputPath('nested-groups-light.png') })

    await page.reload()
    await waitForActiveWorktree(page)
    await expect(card).toHaveAttribute('data-worktree-section-key', reviewKey)
    const todo = page.locator(
      '[role="button"][data-workspace-status-drop-target][data-workspace-status="todo"]'
    )
    await todo.hover()
    await todo.locator('[data-repo-header-collapse-affordance]').click()
    await expect(todo).toHaveAttribute('aria-expanded', 'false')
    await dragCard(page, id, todo)
    await expect(card).toHaveAttribute(
      'data-worktree-section-key',
      'custom-group:status/todo/ungrouped'
    )
    await expect(todo).toHaveAttribute('aria-expanded', 'true')
    await page.evaluate(async () => {
      await window.__store!.getState().updateSettings({ theme: 'dark' })
    })
    await page
      .getByRole('listbox', { name: 'Worktrees', exact: true })
      .screenshot({ path: testInfo.outputPath('nested-groups-dark.png') })
  })

  test('subgroups work with Project, PR, and None; plain Status keeps empty drop targets', async ({
    orcaPage: page
  }, testInfo) => {
    const id = await waitForActiveWorktree(page)
    await page.evaluate(async () => {
      const state = window.__store!.getState()
      state.setHideDefaultBranchWorkspace(false)
      state.setShowSleepingWorkspaces(true)
      await state.updateSettings({ experimentalNewWorktreeCardStyle: true })
    })
    const card = worktreeRow(page, id)
    await options(page)
    await page.getByText('Project', { exact: true }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Custom subgroups', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Manage custom groups/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Custom groups', exact: true })
    await dialog.getByRole('textbox', { name: 'New group', exact: true }).fill('Focus')
    await dialog.getByRole('button', { name: 'Add group', exact: true }).click()
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await dragCard(page, id, 'Focus')
    const projectKey = await card.getAttribute('data-worktree-section-key')
    expect(projectKey).toMatch(/^custom-group:within\//)
    const groupId = projectKey?.split('/').at(-1)
    await page
      .getByRole('listbox', { name: 'Worktrees', exact: true })
      .screenshot({ path: testInfo.outputPath('project-subgroups.png') })

    for (const mode of ['PR', 'None']) {
      await options(page)
      await page.getByText(mode, { exact: true }).click()
      await expect(
        page.getByRole('menuitemcheckbox', { name: 'Custom subgroups', exact: true })
      ).toBeChecked()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menu')).toHaveCount(0)
      await expect(card).toHaveAttribute(
        'data-worktree-section-key',
        mode === 'None'
          ? `custom-group:${groupId}`
          : new RegExp(`^custom-group:within/pr%3A[^/]+/${groupId}$`)
      )
      await page
        .getByRole('listbox', { name: 'Worktrees', exact: true })
        .screenshot({ path: testInfo.outputPath(`${mode}-subgroups.png`) })
    }
    await page.reload()
    await waitForActiveWorktree(page)
    await expect(card).toHaveAttribute('data-worktree-section-key', `custom-group:${groupId}`)
    await options(page)
    await page.getByText('Status', { exact: true }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Custom subgroups', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    const headers = page.locator('[role="button"][data-workspace-status-drop-target]')
    await expect(headers).toHaveCount(5)
    await expect(page.getByRole('button', { name: 'Todo', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible()
    await card.locator('[data-worktree-card-surface]').hover()
    await page.mouse.down()
    try {
      await page.getByRole('button', { name: 'In review', exact: true }).hover()
      await expect(page.locator('[data-worktree-sidebar-drag-preview="true"]')).toHaveCount(1)
    } finally {
      await page.mouse.up()
    }
    await expect(card).toHaveAttribute('data-worktree-section-key', 'workspace-status:in-review')
  })
})
