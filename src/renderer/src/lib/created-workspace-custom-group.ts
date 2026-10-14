import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { getAllWorktreesFromState } from '@/store/selectors'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { folderWorkspaceToWorktree } from '../../../shared/folder-workspace-worktree'
import type { WorkspaceCardIdentity } from '../../../shared/workspace-card-identity'
import { translate } from '@/i18n/i18n'

export function assignCreatedWorkspaceToGroup(
  created: WorkspaceCardIdentity,
  groupId: string | null | undefined
): void {
  if (!groupId) {
    return
  }
  try {
    const groups = useCustomWorkspaceGroups.getState()
    if (!groups.data.groups.some((group) => group.id === groupId)) {
      toast.info(
        translate(
          'custom.groups.createdGroupDeleted',
          'The selected group was deleted. The new workspace is ungrouped.'
        )
      )
      return
    }
    const state = useAppStore.getState()
    // RPC responses can describe themselves as local; the renderer catalog owns host qualification.
    const matches = [
      ...getAllWorktreesFromState(state),
      ...state.folderWorkspaces.map(folderWorkspaceToWorktree)
    ].filter(
      (workspace) =>
        workspace.id === created.id &&
        (!created.instanceId || workspace.instanceId === created.instanceId)
    )
    if (matches.length !== 1) {
      toast.warning(
        translate(
          'custom.groups.createdTargetUnknown',
          'Could not identify the new workspace’s group target. Choose its group in the card’s hover details.'
        )
      )
      return
    }
    groups.assignGroup(matches[0]!, groupId)
  } catch {
    // Group preferences must never turn a successful create into a retryable workspace failure.
    toast.warning(
      translate(
        'custom.groups.createdSaveFailed',
        'Workspace created, but its custom group could not be saved.'
      )
    )
  }
}
