// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createUIStore } from './slices/ui-slice-test-harness'
import { useCustomWorkspaceGroups } from './custom-workspace-groups'
import {
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  getCustomWorkspaceGroupId
} from '../../../shared/custom-workspace-groups'

beforeEach(() => {
  localStorage.clear()
  useCustomWorkspaceGroups.setState({ data: EMPTY_CUSTOM_WORKSPACE_GROUPS })
})

afterEach(() => vi.unstubAllGlobals())

it('explicit native grouping requests leave custom mode without deleting its groups', () => {
  vi.stubGlobal('window', { api: { ui: { set: vi.fn().mockResolvedValue(undefined) } } })
  const ui = createUIStore()
  const custom = useCustomWorkspaceGroups.getState()
  custom.saveGroup({ id: 'one', name: 'Frontend' })
  custom.setEnabled(true)
  ui.getState().setGroupBy('repo')
  expect(useCustomWorkspaceGroups.getState().data.enabled).toBe(false)
  expect(useCustomWorkspaceGroups.getState().data.groups).toEqual([{ id: 'one', name: 'Frontend' }])
})

it('restores one set of groups, order, assignment, and grouping preference', async () => {
  const actions = useCustomWorkspaceGroups.getState()
  const card = { id: 'workspace' }
  actions.saveGroup({ id: 'one', name: 'Frontend' })
  actions.saveGroup({ id: 'two', name: 'Infrastructure' })
  actions.moveGroup('two', -1)
  actions.assignGroup(card, 'one')
  actions.setEnabled(true)
  const saved = localStorage.getItem('orca-custom-workspace-groups')
  useCustomWorkspaceGroups.setState({ data: EMPTY_CUSTOM_WORKSPACE_GROUPS })
  localStorage.setItem('orca-custom-workspace-groups', saved ?? '')
  await useCustomWorkspaceGroups.persist.rehydrate()
  const restored = useCustomWorkspaceGroups.getState().data
  expect(restored.enabled).toBe(true)
  expect(restored.groups.map((group) => group.id)).toEqual(['two', 'one'])
  expect(getCustomWorkspaceGroupId(restored, card)).toBe('one')
  actions.deleteGroup('one')
  expect(getCustomWorkspaceGroupId(useCustomWorkspaceGroups.getState().data, card)).toBeNull()
})
