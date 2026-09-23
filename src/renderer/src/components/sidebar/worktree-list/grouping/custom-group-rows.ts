import { folderWorkspaceToWorktree } from '../../../../../../shared/folder-workspace-worktree'
import {
  customGroupChildKey,
  getCustomWorkspaceGroupId,
  UNGROUPED_CUSTOM_GROUP_ID,
  type CustomWorkspaceGroups
} from '../../../../../../shared/custom-workspace-groups'
import type { Worktree } from '../../../../../../shared/worktree/types'
import type { SectionAppendContext } from './group-sections'
import { PROJECT_GROUP_META } from './group-keys'
import { getLaneHostWorktreeCounts, getLaneHostWorktreeIds } from './host-labels'
import { appendWorktreeRows, buildFolderWorkspaceRow } from './row-builders'
import {
  compareFolderWorkspacesForDisplay,
  type RenderableFolderWorkspace
} from './folder-workspace-lanes'

export type CustomGroupRowsContext = Pick<
  SectionAppendContext,
  | 'result'
  | 'repoMap'
  | 'defaultHostId'
  | 'collapsedGroups'
  | 'lineageById'
  | 'worktreeMap'
  | 'nestLineage'
  | 'cyclicLineageIds'
  | 'mixedWorktreeHostContextLabels'
>
type Bucket = { name: string; items: Worktree[]; folders: RenderableFolderWorkspace[] }

export function appendCustomGroupRows(
  ctx: CustomGroupRowsContext,
  data: CustomWorkspaceGroups,
  worktrees: Worktree[],
  folders: readonly RenderableFolderWorkspace[],
  parentKey: string | null = null,
  groupDepth = parentKey === null ? 0 : 1
): void {
  const buckets = new Map<string, Bucket>(
    data.groups.map((group) => [group.id, { name: group.name, items: [], folders: [] }])
  )
  const ungrouped: Bucket = { name: 'Ungrouped', items: [], folders: [] }
  buckets.set(UNGROUPED_CUSTOM_GROUP_ID, ungrouped)
  for (const worktree of worktrees) {
    const id = getCustomWorkspaceGroupId(data, worktree)
    const bucket = id ? (buckets.get(id) ?? ungrouped) : ungrouped
    bucket.items.push(worktree)
  }
  for (const folder of folders) {
    const id = getCustomWorkspaceGroupId(data, folderWorkspaceToWorktree(folder.folderWorkspace))
    const bucket = id ? (buckets.get(id) ?? ungrouped) : ungrouped
    bucket.folders.push(folder)
  }
  for (const [id, bucket] of buckets) {
    const count = bucket.items.length + bucket.folders.length
    const key = customGroupChildKey(id, parentKey)
    ctx.result.push({
      type: 'header',
      key,
      label: bucket.name,
      count,
      customGroup: true,
      projectGroupDepth: groupDepth,
      tone: PROJECT_GROUP_META.tone,
      icon: PROJECT_GROUP_META.icon,
      worktreeIds: bucket.items.map((worktree) => worktree.id),
      hostWorktreeCounts: getLaneHostWorktreeCounts(
        bucket.items,
        bucket.folders,
        ctx.repoMap,
        ctx.defaultHostId
      ),
      hostWorktreeIds: getLaneHostWorktreeIds(
        bucket.items,
        bucket.folders,
        ctx.repoMap,
        ctx.defaultHostId
      )
    })
    if (ctx.collapsedGroups.has(key)) {
      continue
    }
    appendWorktreeRows(ctx.result, bucket.items, ctx.repoMap, ctx.lineageById, ctx.worktreeMap, {
      nestLineage: ctx.nestLineage,
      collapsedGroups: ctx.collapsedGroups,
      groupDepth,
      sectionKey: key,
      hostContextLabelByWorktreeIdentity: ctx.mixedWorktreeHostContextLabels,
      cyclicLineageIds: ctx.cyclicLineageIds
    })
    for (const folder of bucket.folders.sort((a, b) =>
      compareFolderWorkspacesForDisplay(a.folderWorkspace, b.folderWorkspace)
    )) {
      ctx.result.push({ ...buildFolderWorkspaceRow(folder, groupDepth), sectionKey: key })
    }
  }
}
