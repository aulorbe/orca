import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree } from './helpers/store'

const helperPath = '/Users/test/Applications/Orca Custom Dev Computer Use.app'

test('Computer Use identifies the actual app to allow in macOS privacy settings', async ({
  orcaPage: page,
  electronApp
}, testInfo) => {
  await waitForActiveWorktree(page)
  await electronApp.evaluate(({ ipcMain }, helperAppPath) => {
    ipcMain.removeHandler('computerUsePermissions:getStatus')
    ipcMain.handle('computerUsePermissions:getStatus', () => ({
      platform: 'darwin',
      helperAppPath,
      helperUnavailableReason: null,
      permissions: [
        { id: 'accessibility', status: 'not-granted' },
        { id: 'screenshots', status: 'not-granted' }
      ]
    }))
  }, helperPath)
  await page.evaluate(() => {
    const state = window.__store!.getState()
    state.openSettingsTarget({ pane: 'computer-use', repoId: null })
    state.openSettingsPage()
  })
  await expect(
    page.getByText('App to allow: Orca Custom Dev Computer Use', { exact: true })
  ).toBeVisible()
  await expect(page.getByText(helperPath, { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Show permission app in Finder', exact: true })
  ).toBeVisible()
  await page
    .getByText('App to allow: Orca Custom Dev Computer Use', { exact: true })
    .locator('..')
    .screenshot({ path: testInfo.outputPath('computer-use-permission-app.png') })
})
