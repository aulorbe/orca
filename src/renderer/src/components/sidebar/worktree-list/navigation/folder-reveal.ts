import type { FolderWorkspace } from '../../../../../../shared/folder-workspace-types'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import {
  customGroupChildKey,
  getCustomWorkspaceGroupId,
  getCustomParentGroupBy
} from '../../../../../../shared/custom-workspace-groups'
import type { ProjectGroup } from '../../../../../../shared/project-group-types'
import type { WorkspaceStatusDefinition, Worktree } from '../../../../../../shared/worktree/types'
import {
  folderWorkspaceToWorktree,
  getFolderWorkspaceHostIdentity
} from '../../../../../../shared/folder-workspace-worktree'
import {
  normalizeWorkspaceSessionKeyToWorkspaceId,
  parseWorkspaceKey
} from '../../../../../../shared/workspace-scope'
import {
  composeWorktreeHostIdentity,
  getExecutionHostIdFromWorktreeHostIdentity
} from '../../../../../../shared/worktree/host-qualified-identity'
import { getProjectGroupHeaderKey } from '../grouping/group-keys'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host'
import { getFolderWorkspaceLaneKey } from '../grouping/folder-workspace-lanes'
import type { WorktreeGroupBy } from '../grouping/row-types'
import { getFolderWorkspaceHostId } from '../../folder-workspace-host-id'
import { getHostSectionCollapseKey } from '../../host-section-collapse'

function findFolderWorkspaceByKey(
  worktreeId: string,
  folderWorkspaces: readonly FolderWorkspace[],
  executionHostId?: ExecutionHostId | null
): FolderWorkspace | null {
  const scope = parseWorkspaceKey(worktreeId)
  if (scope?.type !== 'folder') {
    return null
  }
  return (
    folderWorkspaces.find(
      (workspace) =>
        workspace.id === scope.folderWorkspaceId &&
        (!executionHostId ||
          getFolderWorkspaceHostIdentity(workspace) ===
            composeWorktreeHostIdentity(executionHostId, worktreeId))
    ) ?? null
  )
}

export function getKnownSidebarWorktreeById(
  worktreeId: string,
  worktreeMap: ReadonlyMap<string, Worktree>,
  folderWorkspaces: readonly FolderWorkspace[],
  worktrees?: readonly Worktree[],
  executionHostId?: ExecutionHostId | null
): Worktree | null {
  const workspaceId = normalizeWorkspaceSessionKeyToWorkspaceId(worktreeId)
  const ownerHostId = getExecutionHostIdFromWorktreeHostIdentity(worktreeId) ?? executionHostId
  const worktree = ownerHostId
    ? (worktrees?.find(
        (candidate) => candidate.id === workspaceId && candidate.hostId === ownerHostId
      ) ?? null)
    : worktreeMap.get(workspaceId)
  if (worktree) {
    return worktree
  }
  const folderWorkspace = findFolderWorkspaceByKey(workspaceId, folderWorkspaces, ownerHostId)
  return folderWorkspace ? folderWorkspaceToWorktree(folderWorkspace) : null
}

export function sidebarWorkspaceStillExists(
  worktreeId: string,
  worktrees: readonly Worktree[],
  folderWorkspaces: readonly FolderWorkspace[],
  executionHostId?: ExecutionHostId
): boolean {
  if (
    worktrees.some(
      (worktree) =>
        worktree.id === worktreeId &&
        (!executionHostId || !worktree.hostId || worktree.hostId === executionHostId)
    )
  ) {
    return true
  }
  return findFolderWorkspaceByKey(worktreeId, folderWorkspaces, executionHostId) !== null
}

export function getFolderWorkspaceRevealGroupKeys(
  worktreeId: string,
  folderWorkspaces: readonly FolderWorkspace[],
  projectGroups: readonly ProjectGroup[],
  options?: {
    groupBy?: WorktreeGroupBy
    workspaceStatuses?: readonly WorkspaceStatusDefinition[]
    defaultHostId?: ExecutionHostId
    hostScopedGroups?: boolean
    executionHostId?: ExecutionHostId
  }
): string[] {
  const folderWorkspace = findFolderWorkspaceByKey(
    worktreeId,
    folderWorkspaces,
    options?.executionHostId
  )
  if (!folderWorkspace) {
    return []
  }

  const customGroups = useCustomWorkspaceGroups.getState().data
  const groupBy = customGroups.enabled
    ? (getCustomParentGroupBy(customGroups) ?? 'none')
    : options?.groupBy
  const groupsById = new Map(
    projectGroups
      .filter(
        (group) =>
          !options?.executionHostId || getRepoExecutionHostId(group) === options.executionHostId
      )
      .map((group) => [group.id, group])
  )
  const keys: string[] = []
  const seen = new Set<string>()
  let groupId: string | null = folderWorkspace.projectGroupId
  while (groupId && !seen.has(groupId)) {
    seen.add(groupId)
    const group = groupsById.get(groupId)
    if (!group) {
      break
    }
    keys.unshift(getProjectGroupHeaderKey(group.id))
    groupId = group.parentGroupId
  }

  // Under non-repo grouping the project-group headers above do not exist, so the
  // lane and host headers are the ones actually hiding the row (#15362). Lane
  // keys come from the same function grouping uses, so the two cannot disagree.
  const owningGroup = groupsById.get(folderWorkspace.projectGroupId)
  // Why (fork): custom-group child keys nest under the raw lane key (matching
  // worktree-group-keys), while the collapsed header key may be host-scoped.
  let parentKey = keys.at(-1) ?? null
  let parentHeaderKey = parentKey
  if (groupBy && groupBy !== 'repo' && owningGroup) {
    parentKey = getFolderWorkspaceLaneKey(
      { folderWorkspace, projectGroup: owningGroup },
      groupBy,
      options?.workspaceStatuses ?? []
    )
    parentHeaderKey =
      options?.hostScopedGroups && options.defaultHostId
        ? getHostSectionCollapseKey(
            parentKey,
            getFolderWorkspaceHostId(folderWorkspace, owningGroup, options.defaultHostId)
          )
        : parentKey
    keys.push(parentHeaderKey)
  }
  if (owningGroup && options?.defaultHostId) {
    keys.push(
      `host:${getFolderWorkspaceHostId(folderWorkspace, owningGroup, options.defaultHostId)}`
    )
  }
  if (!customGroups.enabled) {
    return keys
  }
  const nested = groupBy !== 'none'
  return [
    ...keys.filter(
      (key) =>
        key.startsWith('host:') || (nested && (groupBy === 'repo' || key === parentHeaderKey))
    ),
    customGroupChildKey(
      getCustomWorkspaceGroupId(customGroups, folderWorkspaceToWorktree(folderWorkspace)),
      nested ? parentKey : null
    )
  ]
}
