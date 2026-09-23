import type { AppState } from '@/store/types'
import { getRepoMapFromState } from '@/store/selectors'
import { getProjectHostSetupProjectionFromState } from '@/store/project-host-setup-selector'
import type { Worktree } from '../../../../shared/worktree/types'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import { getWorkspaceStatus, getWorkspaceStatusGroupKey } from './workspace-status'
import { getProjectGroupHeaderKey } from './worktree-list/grouping/group-keys'
import { getFolderWorkspaceLaneKey } from './worktree-list/grouping/folder-workspace-lanes'
import {
  getGroupKeyForWorktree,
  getGroupKeysForWorktree
} from './worktree-list/grouping/worktree-group-keys'
import type { WorktreeGroupBy } from './worktree-list/grouping/row-types'
import { getFolderWorkspaceRevealGroupKeys } from './worktree-list/navigation/folder-reveal'

export function getCustomWorkspaceRevealKeys(state: AppState, workspace: Worktree): string[] {
  if (parseWorkspaceKey(workspace.id)?.type === 'folder') {
    return getFolderWorkspaceRevealGroupKeys(
      workspace.id,
      state.folderWorkspaces,
      state.projectGroups,
      { groupBy: state.groupBy, workspaceStatuses: state.workspaceStatuses }
    )
  }
  const projection = getProjectHostSetupProjectionFromState(state)
  return getGroupKeysForWorktree(
    state.groupBy,
    workspace,
    getRepoMapFromState(state),
    state.prCache,
    state.workspaceStatuses,
    state.settings,
    state.projectGroups,
    { projects: projection.projects, projectHostSetups: projection.setups }
  )
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
    const folderWorkspace = state.folderWorkspaces.find(
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
  const projection = getProjectHostSetupProjectionFromState(state)
  return getGroupKeyForWorktree(
    groupBy,
    workspace,
    getRepoMapFromState(state),
    state.prCache,
    state.workspaceStatuses,
    state.settings,
    { projects: projection.projects, projectHostSetups: projection.setups }
  )
}
