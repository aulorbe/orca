// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import {
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  getCustomWorkspaceGroupId
} from '../../../shared/custom-workspace-groups'
import { worktree } from '../components/sidebar/worktree-list-groups-test-fixtures'
import type { Worktree } from '../../../shared/worktree/types'
import type { FolderWorkspace } from '../../../shared/folder-workspace-types'
import { folderWorkspaceToWorktree } from '../../../shared/folder-workspace-worktree'

const mocks = vi.hoisted(() => ({ getState: vi.fn(), info: vi.fn(), warning: vi.fn() }))
vi.mock('@/store', () => ({ useAppStore: { getState: mocks.getState } }))
vi.mock('sonner', () => ({ toast: { info: mocks.info, warning: mocks.warning } }))
import { assignCreatedWorkspaceToGroup } from './created-workspace-custom-group'

const local: Worktree = { ...worktree, hostId: 'local', instanceId: 'local-instance' }
const remote: Worktree = { ...worktree, hostId: 'ssh:box', instanceId: 'remote-instance' }
beforeEach(() => {
  vi.restoreAllMocks()
  mocks.info.mockClear()
  mocks.warning.mockClear()
  mocks.getState.mockReturnValue({
    worktreesByRepo: { repo: [local, remote] },
    folderWorkspaces: []
  })
  useCustomWorkspaceGroups.setState({
    data: { ...EMPTY_CUSTOM_WORKSPACE_GROUPS, groups: [{ id: 'front', name: 'Frontend' }] }
  })
})

it('uses the renderer-owned host and instance rather than the server-local identity', () => {
  assignCreatedWorkspaceToGroup({ ...remote, hostId: 'local' }, 'front')
  const data = useCustomWorkspaceGroups.getState().data
  expect(getCustomWorkspaceGroupId(data, remote)).toBe('front')
  expect(getCustomWorkspaceGroupId(data, local)).toBeNull()
})

it('leaves Ungrouped alone and does not affect existing assignments', () => {
  useCustomWorkspaceGroups.getState().assignGroup(local, 'front')
  assignCreatedWorkspaceToGroup(remote, null)
  expect(getCustomWorkspaceGroupId(useCustomWorkspaceGroups.getState().data, local)).toBe('front')
  expect(getCustomWorkspaceGroupId(useCustomWorkspaceGroups.getState().data, remote)).toBeNull()
})

it('does not assign an ambiguous or replaced workspace', () => {
  assignCreatedWorkspaceToGroup({ id: local.id }, 'front')
  assignCreatedWorkspaceToGroup({ ...remote, instanceId: 'old' }, 'front')
  expect(useCustomWorkspaceGroups.getState().data.assignments).toEqual({})
  expect(mocks.warning).toHaveBeenCalledTimes(2)
})

it('does not recreate a group deleted during creation or turn a preference error into creation failure', () => {
  assignCreatedWorkspaceToGroup(local, 'deleted')
  expect(mocks.info).toHaveBeenCalled()
  vi.spyOn(useCustomWorkspaceGroups.getState(), 'assignGroup').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  expect(() => assignCreatedWorkspaceToGroup(local, 'front')).not.toThrow()
  expect(mocks.warning).toHaveBeenCalled()
})

it('assigns folder workspaces using the same card identity', () => {
  const folder: FolderWorkspace = {
    id: 'folder-one',
    projectGroupId: 'project',
    name: 'Folder',
    folderPath: '/folder',
    linkedTask: null,
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    createdAt: 1,
    updatedAt: 1
  }
  mocks.getState.mockReturnValue({ worktreesByRepo: {}, folderWorkspaces: [folder] })
  const card = folderWorkspaceToWorktree(folder)
  assignCreatedWorkspaceToGroup(card, 'front')
  expect(getCustomWorkspaceGroupId(useCustomWorkspaceGroups.getState().data, card)).toBe('front')
})
