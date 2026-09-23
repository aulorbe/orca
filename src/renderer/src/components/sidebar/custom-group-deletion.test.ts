// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import type { AppState } from '@/store/types'
import type { WorktreeBatchDeleteOptions, WorktreeDeleteIdentity } from './worktree-delete-request'
import { worktree, repo } from './worktree-list-groups-test-fixtures'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { EMPTY_CUSTOM_WORKSPACE_GROUPS } from '../../../../shared/custom-workspace-groups'

const mocks = vi.hoisted(() => {
  const state: Pick<AppState, 'worktreesByRepo' | 'folderWorkspaces'> = {
    worktreesByRepo: {},
    folderWorkspaces: []
  }
  return {
    state,
    runBatch:
      vi.fn<
        (
          targets: readonly WorktreeDeleteIdentity[],
          options?: WorktreeBatchDeleteOptions
        ) => boolean
      >()
  }
})
vi.mock('@/store', () => ({ useAppStore: { getState: () => mocks.state } }))
vi.mock('./delete-worktree-flow', () => ({ runWorktreeBatchDelete: mocks.runBatch }))
import {
  customGroupDeletionPlan,
  requestCustomGroupWorkspaceDeletion
} from './custom-group-deletion'

const card = { ...worktree, hostId: 'local' as const, instanceId: 'one' }
const other = { ...card, id: 'other', instanceId: 'two' }

beforeEach(() => {
  mocks.runBatch.mockReset().mockReturnValue(true)
  mocks.state.worktreesByRepo = { [repo.id]: [card, other] }
  useCustomWorkspaceGroups.setState({ data: EMPTY_CUSTOM_WORKSPACE_GROUPS })
  const groups = useCustomWorkspaceGroups.getState()
  groups.saveGroup({ id: 'group', name: 'Group' })
  groups.assignWorkspaces([card, other], 'group')
})

it('requires the existing confirmation and retains the group on cancellation or partial deletion', () => {
  expect(requestCustomGroupWorkspaceDeletion('group')).toBe(true)
  const options = mocks.runBatch.mock.calls[0]?.[1]
  expect(options).toMatchObject({ forceConfirm: true, forceOnConfirm: false })
  expect(useCustomWorkspaceGroups.getState().data.groups).toHaveLength(1)
  options?.onDeleted?.([{ id: card.id, executionHostId: 'local' }])
  expect(useCustomWorkspaceGroups.getState().data.groups).toHaveLength(1)
  options?.onDeleted?.([{ id: other.id, executionHostId: 'local' }])
  expect(useCustomWorkspaceGroups.getState().data.groups).toHaveLength(0)
})

it('does not remove a group that gained another card while deletion was in progress', () => {
  requestCustomGroupWorkspaceDeletion('group')
  useCustomWorkspaceGroups
    .getState()
    .assignGroup({ id: 'new', hostId: 'local', instanceId: 'new' }, 'group')
  mocks.runBatch.mock.calls[0]?.[1]?.onDeleted?.([
    { id: card.id, executionHostId: 'local' },
    { id: other.id, executionHostId: 'local' }
  ])
  expect(useCustomWorkspaceGroups.getState().data.groups).toHaveLength(1)
})

it('blocks bulk deletion of primary, folder, and unavailable cards', () => {
  const groups = useCustomWorkspaceGroups.getState()
  expect(
    customGroupDeletionPlan(groups.data, 'group', [{ ...card, isMainWorktree: true }, other])
      .blockedReason
  ).toContain('Primary')
  groups.assignGroup({ id: 'folder:one' }, 'group')
  expect(
    customGroupDeletionPlan(useCustomWorkspaceGroups.getState().data, 'group', [card, other])
      .blockedReason
  ).toContain('unavailable')
})
