import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'
import { worktreeRow } from './worktree-row-locators'

test('stacked PR cards show the Graphite stack on icon and title hover; one-off PRs stay plain', async ({
  orcaPage: page,
  electronApp
}, testInfo) => {
  const primary = await waitForActiveWorktree(page)
  await electronApp.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('hostedReview:forBranch')
    ipcMain.handle(
      'hostedReview:forBranch',
      (_event: unknown, args: { linkedGitHubPR?: number }) => {
        const number = args.linkedGitHubPR ?? 400
        return {
          provider: 'github',
          number,
          title: number === 102 ? 'API layer' : 'Standalone change',
          state: 'open',
          url: `https://github.com/acme/widgets/pull/${number}`,
          status: 'neutral',
          updatedAt: '2026-09-01T00:00:00Z',
          mergeable: 'MERGEABLE',
          ...(number === 102
            ? {
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
            : {})
        }
      }
    )
  })
  const secondary = await page.evaluate(async (primary) => {
    const store = window.__store!
    const state = store.getState()
    state.setShowSleepingWorkspaces(true)
    state.setHideDefaultBranchWorkspace(false)
    state.setSidebarWidth(260)
    await state.updateSettings({ experimentalNewWorktreeCardStyle: true, theme: 'light' })
    const other = Object.values(state.worktreesByRepo)
      .flat()
      .find((workspace) => workspace.id !== primary)
    if (!other) {
      throw new Error('Second workspace missing')
    }
    store.setState((state) => ({
      worktreesByRepo: Object.fromEntries(
        Object.entries(state.worktreesByRepo).map(([repoId, rows]) => [
          repoId,
          rows.map((row) => ({
            ...row,
            linkedPR: row.id === primary ? 102 : 400,
            displayName: row.id === primary ? 'API layer' : 'Standalone change'
          }))
        ])
      )
    }))
    for (const workspace of Object.values(store.getState().worktreesByRepo).flat()) {
      const repo = store.getState().repos.find((repo) => repo.id === workspace.repoId)!
      await store
        .getState()
        .fetchHostedReviewForBranch(repo.path, workspace.branch.replace(/^refs\/heads\//, ''), {
          repoId: repo.id,
          linkedGitHubPR: workspace.linkedPR,
          force: true
        })
    }
    return other.id
  }, primary)
  const row = worktreeRow(page, primary)
  const icon = row.locator('[data-worktree-stack-icon]')
  await expect(icon).toHaveAttribute('aria-label', 'Graphite stack: 3 PRs')
  await expect(worktreeRow(page, secondary).locator('[data-worktree-stack-icon]')).toHaveCount(0)
  await icon.hover()
  const list = page.locator('[data-graphite-stack-list]')
  await expect(list).toBeVisible()
  await expect(list.locator('[data-graphite-stack-pr]')).toHaveText([
    '#103UI layer',
    '#102API layerThis PR',
    '#101Shared types'
  ])
  await expect(list.locator('[data-graphite-stack-pr="102"]')).toHaveAttribute(
    'aria-current',
    'true'
  )
  await page
    .locator('[data-slot="hover-card-content"]')
    .screenshot({ path: testInfo.outputPath('graphite-stack-light.png') })
  await page.mouse.move(800, 20)
  await expect(list).toHaveCount(0)
  await page.evaluate(async () => {
    await window.__store!.getState().updateSettings({ theme: 'dark' })
  })
  await row.locator('[data-worktree-title-inline-rename]').first().hover()
  await expect(list).toBeVisible()
  await expect(list).toContainText('UI layer')
  await page
    .locator('[data-slot="hover-card-content"]')
    .screenshot({ path: testInfo.outputPath('graphite-stack-dark.png') })
})
