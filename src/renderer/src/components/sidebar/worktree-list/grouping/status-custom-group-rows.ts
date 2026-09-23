import {
  customGroupSectionKey,
  type CustomWorkspaceGroups
} from '../../../../../../shared/custom-workspace-groups'
import { folderWorkspaceToWorktree } from '../../../../../../shared/folder-workspace-worktree'
import type { WorkspaceStatusDefinition, Worktree } from '../../../../../../shared/worktree/types'
import {
  getWorkspaceStatus,
  getWorkspaceStatusGroupKey,
  getWorkspaceStatusVisualMeta
} from '../../workspace-status'
import { appendCustomGroupRows, type CustomGroupRowsContext } from './custom-group-rows'
import type { RenderableFolderWorkspace } from './folder-workspace-lanes'
import { getLaneHostWorktreeCounts, getLaneHostWorktreeIds } from './host-labels'

export function appendCustomGroupLayout(
  ctx: CustomGroupRowsContext,
  data: CustomWorkspaceGroups,
  worktrees: Worktree[],
  folders: readonly RenderableFolderWorkspace[],
  statuses: readonly WorkspaceStatusDefinition[]
): void {
  if (!data.byStatus) {
    appendCustomGroupRows(ctx, data, worktrees, folders)
    return
  }
  for (const status of statuses) {
    const items = worktrees.filter(
      (worktree) => getWorkspaceStatus(worktree, statuses) === status.id
    )
    const folderItems = folders.filter(
      ({ folderWorkspace }) =>
        getWorkspaceStatus(folderWorkspaceToWorktree(folderWorkspace), statuses) === status.id
    )
    const key = getWorkspaceStatusGroupKey(status.id)
    const meta = getWorkspaceStatusVisualMeta(status)
    ctx.result.push({
      type: 'header',
      key,
      label: status.label,
      count: items.length + folderItems.length,
      tone: meta.tone,
      icon: meta.icon,
      customParentStatus: status.id,
      customGroupDropKey: customGroupSectionKey(null, status.id),
      worktreeIds: items.map((worktree) => worktree.id),
      hostWorktreeCounts: getLaneHostWorktreeCounts(
        items,
        folderItems,
        ctx.repoMap,
        ctx.defaultHostId
      ),
      hostWorktreeIds: getLaneHostWorktreeIds(items, folderItems, ctx.repoMap, ctx.defaultHostId)
    })
    if (!ctx.collapsedGroups.has(key)) {
      appendCustomGroupRows(ctx, data, items, folderItems, status.id)
    }
  }
}
