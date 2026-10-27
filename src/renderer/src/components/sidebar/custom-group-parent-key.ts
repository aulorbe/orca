import type { AppState } from '@/store/types'
import { getRepoMapFromState } from '@/store/selectors'
import { getProjectHostSetupProjectionFromState } from '@/store/project-host-setup-selector'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import type { Worktree } from '../../../../shared/worktree/types'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import {
  getWorkspaceStatus,
  getWorkspaceStatusGroupKey
} from '../../../../shared/workspace-statuses'
import {
  customGroupChildKey,
  getCustomParentGroupBy,
  getCustomWorkspaceGroupId,
  getCustomWorkspaceGroupKeys
} from '../../../../shared/custom-workspace-groups'
import { getProjectGroupHeaderKey } from '../../../../shared/sidebar-list/group-keys'
import { getFolderWorkspaceLaneKey } from '../../../../shared/sidebar-list/folder-workspace-lanes'
import {
  getGroupKeyForWorktree,
  getGroupKeysForWorktree
} from '../../../../shared/sidebar-list/worktree-group-keys'
import type { WorktreeGroupBy } from '../../../../shared/sidebar-list/row-types'
import { createSidebarPRGroupReader } from './worktree-list/grouping/pr-group-key'
import { getFolderWorkspaceRevealGroupKeys } from './worktree-list/navigation/folder-reveal'
import { selectFolderWorkspaces } from '@/store/workspace-record-selectors'

export function getCustomWorkspaceRevealKeys(state: AppState, workspace: Worktree): string[] {
  if (parseWorkspaceKey(workspace.id)?.type === 'folder') {
    return getFolderWorkspaceRevealGroupKeys(
      workspace.id,
      selectFolderWorkspaces(state),
      state.projectGroups,
      { groupBy: state.groupBy, workspaceStatuses: state.workspaceStatuses }
    )
  }
  const customGroups = useCustomWorkspaceGroups.getState().data
  let groupBy = state.groupBy
  if (customGroups.enabled) {
    const parent = getCustomParentGroupBy(customGroups)
    if (parent === null || parent === 'none') {
      return getCustomWorkspaceGroupKeys(customGroups, workspace, state.workspaceStatuses)
    }
    groupBy = parent
  }
  const repoMap = getRepoMapFromState(state)
  const projection = getProjectHostSetupProjectionFromState(state)
  const keys = getGroupKeysForWorktree(
    groupBy,
    workspace,
    repoMap,
    createSidebarPRGroupReader(repoMap, state.prCache),
    state.workspaceStatuses,
    state.projectGroups,
    { projects: projection.projects, projectHostSetups: projection.setups }
  )
  const groupKey = keys.at(-1)
  return customGroups.enabled && groupKey
    ? [...keys, customGroupChildKey(getCustomWorkspaceGroupId(customGroups, workspace), groupKey)]
    : keys
}

export function getCustomParentKey(
  state: AppState,
  workspace: Worktree,
  groupBy: WorktreeGroupBy | null
): string | null {
  if (groupBy === null || groupBy === 'none') {
    return null
  }
  if (groupBy === 'workspace-status') {
    return getWorkspaceStatusGroupKey(getWorkspaceStatus(workspace, state.workspaceStatuses))
  }
  const scope = parseWorkspaceKey(workspace.id)
  if (scope?.type === 'folder') {
    const folderWorkspace = selectFolderWorkspaces(state).find(
      (folder) => folder.id === scope.folderWorkspaceId
    )
    const projectGroup = state.projectGroups.find(
      (group) => group.id === folderWorkspace?.projectGroupId
    )
    if (!folderWorkspace || !projectGroup) {
      return null
    }
    return groupBy === 'repo'
      ? getProjectGroupHeaderKey(projectGroup.id)
      : getFolderWorkspaceLaneKey(
          { folderWorkspace, projectGroup },
          groupBy,
          state.workspaceStatuses
        )
  }
  const repoMap = getRepoMapFromState(state)
  const projection = getProjectHostSetupProjectionFromState(state)
  return getGroupKeyForWorktree(
    groupBy,
    workspace,
    repoMap,
    createSidebarPRGroupReader(repoMap, state.prCache),
    state.workspaceStatuses,
    { projects: projection.projects, projectHostSetups: projection.setups }
  )
}
