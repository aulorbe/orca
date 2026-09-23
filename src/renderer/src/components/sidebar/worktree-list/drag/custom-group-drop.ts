import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { getAllWorktreesFromState } from '@/store/selectors'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import {
  CUSTOM_GROUP_KEY_PREFIX,
  getCustomParentGroupBy,
  parseCustomGroupSectionKey
} from '../../../../../../shared/custom-workspace-groups'
import { folderWorkspaceToWorktree } from '../../../../../../shared/folder-workspace-worktree'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { parseWorkspaceKey } from '../../../../../../shared/workspace-scope'
import type { WorkspaceCardIdentity } from '../../../../../../shared/workspace-card-identity'
import type { Worktree } from '../../../../../../shared/worktree/types'
import type { WorktreePointerDrag } from './row-state'
import { getWorkspaceStatus } from '../../workspace-status'
import { getCustomParentKey } from '../../custom-group-parent-key'

const pendingMoves = new Map<string, symbol>()

export function isCustomGroupDrag(drag: Pick<WorktreePointerDrag, 'sourceGroupKey'>): boolean {
  return drag.sourceGroupKey.startsWith(CUSTOM_GROUP_KEY_PREFIX)
}

export function customDragIncludesFolders(drag: WorktreePointerDrag): boolean {
  return (
    drag.draggedWorkspaces?.some(
      (workspace) => parseWorkspaceKey(workspace.id)?.type === 'folder'
    ) ?? false
  )
}

export function customGroupDropTarget(
  container: HTMLElement | null,
  x: number,
  y: number
): { key: string; element: HTMLElement } | null {
  if (!container) {
    return null
  }
  const hit = document.elementFromPoint(x, y)
  if (!(hit instanceof Element) || !container.contains(hit)) {
    return null
  }
  const element = hit.closest<HTMLElement>(
    '[data-custom-group-key], [data-custom-status-group-key], [data-worktree-section-key]'
  )
  const key =
    element?.dataset.customGroupKey ??
    element?.dataset.customStatusGroupKey ??
    element?.dataset.worktreeSectionKey
  return element && key?.startsWith(CUSTOM_GROUP_KEY_PREFIX) ? { key, element } : null
}

export function clearCustomGroupDropHighlight(): void {
  if (typeof document !== 'undefined') {
    document
      .querySelectorAll<HTMLElement>('[data-custom-group-drop-hover]')
      .forEach((element) => delete element.dataset.customGroupDropHover)
  }
}

export function highlightCustomGroupDrop(
  container: HTMLElement,
  target: { key: string; element: HTMLElement } | null
): void {
  const element = target
    ? ([...container.querySelectorAll<HTMLElement>('[data-custom-group-key]')].find(
        (header) => header.dataset.customGroupKey === target.key
      ) ?? target.element)
    : null
  if (element?.dataset.customGroupDropHover === 'true') {
    return
  }
  clearCustomGroupDropHighlight()
  if (element) {
    element.dataset.customGroupDropHover = 'true'
  }
}

export function resolveCustomDragWorkspaces(
  snapshots: readonly WorkspaceCardIdentity[],
  current: readonly Worktree[]
): Worktree[] | null {
  const byIdentity = new Map<string, Worktree | null>()
  for (const workspace of current) {
    const key = getWorktreeHostIdentity(workspace)
    byIdentity.set(key, byIdentity.has(key) ? null : workspace)
  }
  const resolved: Worktree[] = []
  for (const snapshot of snapshots) {
    const workspace = byIdentity.get(getWorktreeHostIdentity(snapshot))
    if (!workspace || workspace.isArchived || workspace.instanceId !== snapshot.instanceId) {
      return null
    }
    resolved.push(workspace)
  }
  return resolved
}

export async function commitCustomGroupDrop(
  drag: Pick<WorktreePointerDrag, 'draggedWorkspaces'>,
  key: string
): Promise<void> {
  const groups = useCustomWorkspaceGroups.getState()
  const target = parseCustomGroupSectionKey(key)
  const parentGrouping = getCustomParentGroupBy(groups.data)
  if (
    !groups.data.enabled ||
    !target ||
    (parentGrouping === 'workspace-status') !== (target.statusId !== null) ||
    (parentGrouping === null || parentGrouping === 'none') !== (target.parentKey === null)
  ) {
    return
  }
  const state = useAppStore.getState()
  const snapshots = drag.draggedWorkspaces ?? []
  const current = [
    ...getAllWorktreesFromState(state),
    ...(state.folderWorkspaces ?? []).map(folderWorkspaceToWorktree)
  ]
  const workspaces = resolveCustomDragWorkspaces(snapshots, current)
  if (snapshots.length === 0 || !workspaces) {
    toast.error('Workspace list changed. Try dragging again.')
    return
  }
  if (
    (target.statusId !== null &&
      !state.workspaceStatuses.some((status) => status.id === target.statusId)) ||
    (target.groupId !== null && !groups.data.groups.some((group) => group.id === target.groupId))
  ) {
    toast.error('Group or status no longer exists.')
    return
  }
  if (
    (parentGrouping === 'repo' || parentGrouping === 'pr-status') &&
    workspaces.some(
      (workspace) => getCustomParentKey(state, workspace, parentGrouping) !== target.parentKey
    )
  ) {
    toast.error(
      'Project and PR sections are automatic. Choose a subgroup within the card’s own section.'
    )
    return
  }
  const results = await Promise.all(
    workspaces.map(async (workspace) => {
      const identity = getWorktreeHostIdentity(workspace)
      const token = Symbol()
      pendingMoves.set(identity, token)
      try {
        if (
          target.statusId !== null &&
          getWorkspaceStatus(workspace, state.workspaceStatuses) !== target.statusId
        ) {
          const result = await state.updateWorktreeMeta(
            workspace.id,
            { workspaceStatus: target.statusId },
            {
              executionHostId: workspace.hostId ?? 'local',
              shouldApply: (candidate) =>
                Boolean(
                  candidate &&
                  candidate.instanceId === workspace.instanceId &&
                  pendingMoves.get(identity) === token
                )
            }
          )
          if (!result.ok) {
            return false
          }
        }
        if (pendingMoves.get(identity) !== token) {
          return true
        }
        const latest = useAppStore.getState()
        const current = latest.getKnownWorktreeById(workspace.id, workspace.hostId ?? 'local')
        if (
          !current ||
          current.instanceId !== workspace.instanceId ||
          (target.statusId !== null &&
            getWorkspaceStatus(current, latest.workspaceStatuses) !== target.statusId)
        ) {
          return false
        }
        const groups = useCustomWorkspaceGroups.getState()
        groups.assignGroup(workspace, target.groupId)
        for (const groupKey of [...(target.parentKey ? [target.parentKey] : []), key]) {
          if (latest.collapsedGroups.has(groupKey)) {
            latest.toggleCollapsedGroup(groupKey)
          }
        }
        return true
      } catch {
        return false
      } finally {
        if (pendingMoves.get(identity) === token) {
          pendingMoves.delete(identity)
        }
      }
    })
  )
  if (results.some((success) => !success)) {
    toast.error('Some cards could not be moved. Check their status and try again.')
  }
}
