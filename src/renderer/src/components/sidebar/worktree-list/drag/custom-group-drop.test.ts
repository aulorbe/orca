// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { resolveCustomDragWorkspaces } from './custom-group-drop'
import { customGroupDragRows } from './custom-group-drag-rows'
import { worktree } from '../../worktree-list-groups-test-fixtures'
import {
  assignCustomWorkspacesGroup,
  deleteCustomWorkspaceGroup,
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  getCustomWorkspaceGroupId,
  saveCustomWorkspaceGroup
} from '../../../../../../shared/custom-workspace-groups'

const local = { ...worktree, hostId: 'local' as const, instanceId: 'one' }
const remote = { ...local, hostId: 'ssh:box' as const }

it('resolves drag snapshots by host and instance and rejects stale or ambiguous cards', () => {
  expect(resolveCustomDragWorkspaces([local], [local, remote])).toEqual([local])
  expect(resolveCustomDragWorkspaces([remote], [local, remote])).toEqual([remote])
  expect(resolveCustomDragWorkspaces([local], [{ ...local, instanceId: 'replaced' }])).toBeNull()
  expect(resolveCustomDragWorkspaces([local], [local, local])).toBeNull()
  expect(resolveCustomDragWorkspaces([local], [{ ...local, isArchived: true }])).toBeNull()
})

it('moves a selected set together and can move group members elsewhere on deletion', () => {
  let data = saveCustomWorkspaceGroup(EMPTY_CUSTOM_WORKSPACE_GROUPS, { id: 'a', name: 'A' })
  data = saveCustomWorkspaceGroup(data, { id: 'b', name: 'B' })
  data = assignCustomWorkspacesGroup(data, [local, remote], 'a')
  expect(getCustomWorkspaceGroupId(data, local)).toBe('a')
  expect(getCustomWorkspaceGroupId(data, remote)).toBe('a')
  data = deleteCustomWorkspaceGroup(data, 'a', 'b')
  expect(getCustomWorkspaceGroupId(data, local)).toBe('b')
  expect(getCustomWorkspaceGroupId(data, remote)).toBe('b')
  expect(() => deleteCustomWorkspaceGroup(data, 'b', 'b')).toThrow('another existing group')
})

it('preserves non-custom drag rows', () => {
  const header = {
    type: 'header' as const,
    key: 'repo:one',
    label: 'Repo',
    count: 0,
    tone: 'text-muted-foreground'
  }
  expect(customGroupDragRows([header])[0]).toBe(header)
})
