import { folderWorkspaceToWorktree } from '../../../../../../shared/folder-workspace-worktree'
import {
  customGroupChildKey,
  getCustomWorkspaceGroupId,
  UNGROUPED_CUSTOM_GROUP_ID,
  type CustomWorkspaceGroups
} from '../../../../../../shared/custom-workspace-groups'
import type { Worktree } from '../../../../../../shared/worktree/types'
import type { SectionAppendContext } from './group-sections'
import type { Row } from './row-types'
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
  | 'showEmptyCustomGroups'
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
  // Why: ungrouped cards sit one level up, before any sticky group header that could claim them.
  const ungroupedKey = customGroupChildKey(UNGROUPED_CUSTOM_GROUP_ID, parentKey)
  const ungroupedDepth = Math.max(0, groupDepth - 1)
  const ungroupedCount = ungrouped.items.length + ungrouped.folders.length
  // Why: top-level ungrouped has no parent header to drop on, so expose one while dragging.
  if (ungroupedCount === 0 && parentKey === null && ctx.showEmptyCustomGroups) {
    ctx.result.push(buildBucketHeader(ctx, ungroupedKey, ungrouped, groupDepth))
  }
  appendBucketRows(ctx, ungrouped, ungroupedKey, ungroupedDepth)
  buckets.delete(UNGROUPED_CUSTOM_GROUP_ID)
  for (const [id, bucket] of buckets) {
    const count = bucket.items.length + bucket.folders.length
    // Why: empty groups only matter as drop targets, so they appear just during a drag.
    if (count === 0 && !ctx.showEmptyCustomGroups) {
      continue
    }
    const key = customGroupChildKey(id, parentKey)
    ctx.result.push(buildBucketHeader(ctx, key, bucket, groupDepth))
    if (ctx.collapsedGroups.has(key)) {
      continue
    }
    appendBucketRows(ctx, bucket, key, groupDepth)
  }
}

function buildBucketHeader(
  ctx: CustomGroupRowsContext,
  key: string,
  bucket: Bucket,
  groupDepth: number
): Row {
  return {
    type: 'header',
    key,
    label: bucket.name,
    count: bucket.items.length + bucket.folders.length,
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
  }
}

function appendBucketRows(
  ctx: CustomGroupRowsContext,
  bucket: Bucket,
  key: string,
  groupDepth: number
): void {
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
