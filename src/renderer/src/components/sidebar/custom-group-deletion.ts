import { useAppStore } from '@/store'
import { getAllWorktreesFromState } from '@/store/selectors'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import {
  getCustomWorkspaceGroupId,
  type CustomWorkspaceGroups
} from '../../../../shared/custom-workspace-groups'
import { getWorkspaceCardKeys } from '../../../../shared/workspace-card-identity'
import { folderWorkspaceToWorktree } from '../../../../shared/folder-workspace-worktree'
import {
  composeWorktreeHostIdentity,
  getWorktreeHostIdentity
} from '../../../../shared/worktree/host-qualified-identity'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import type { Worktree } from '../../../../shared/worktree/types'
import { runWorktreeBatchDelete } from './delete-worktree-flow'
import { toWorktreeDeleteIdentities } from './worktree-delete-request'

export function customGroupDeletionPlan(
  data: CustomWorkspaceGroups,
  groupId: string,
  catalog: readonly Worktree[]
) {
  const known = new Set(catalog.flatMap(getWorkspaceCardKeys))
  const unavailable = Object.entries(data.assignments).some(
    ([key, id]) => id === groupId && !known.has(key)
  )
  const members = catalog.filter(
    (workspace) => getCustomWorkspaceGroupId(data, workspace) === groupId
  )
  const protectedMembers = members.some(
    (workspace) => workspace.isMainWorktree || parseWorkspaceKey(workspace.id)?.type === 'folder'
  )
  const blockedReason = unavailable
    ? 'Some assigned workspaces are unavailable. Reconnect them or move the cards instead.'
    : protectedMembers
      ? 'Primary and folder workspaces must be removed individually. You can move their cards instead.'
      : members.length === 0
        ? 'There are no workspaces to delete.'
        : null
  return { members, blockedReason }
}

export function requestCustomGroupWorkspaceDeletion(groupId: string): boolean {
  const app = useAppStore.getState()
  const data = useCustomWorkspaceGroups.getState().data
  const catalog = [
    ...getAllWorktreesFromState(app),
    ...(app.folderWorkspaces ?? []).map(folderWorkspaceToWorktree)
  ]
  const plan = customGroupDeletionPlan(data, groupId, catalog)
  if (plan.blockedReason) {
    throw new Error(plan.blockedReason)
  }
  const requested = new Map(
    plan.members.map((workspace) => [getWorktreeHostIdentity(workspace), workspace])
  )
  const deleted = new Set<string>()
  return runWorktreeBatchDelete(toWorktreeDeleteIdentities(plan.members), {
    forceConfirm: true,
    forceOnConfirm: false,
    onDeleted: (targets) => {
      const confirmed = targets.flatMap((target) => {
        const key = composeWorktreeHostIdentity(target.executionHostId ?? undefined, target.id)
        const workspace = requested.get(key)
        if (!workspace) {
          return []
        }
        deleted.add(key)
        return [workspace]
      })
      const groups = useCustomWorkspaceGroups.getState()
      groups.clearDeletedAssignments(groupId, confirmed)
      // Keep the group on cancellation/partial failure, or if someone added another card meanwhile.
      if (
        deleted.size === requested.size &&
        !Object.values(useCustomWorkspaceGroups.getState().data.assignments).includes(groupId)
      ) {
        groups.deleteGroup(groupId)
      }
    }
  })
}
