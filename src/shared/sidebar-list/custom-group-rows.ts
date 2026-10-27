import { folderWorkspaceToWorktree } from '../folder-workspace-worktree'
import {
  CUSTOM_GROUP_KEY_PREFIX,
  customGroupChildKey,
  getCustomParentGroupBy,
  getCustomWorkspaceGroupId,
  UNGROUPED_CUSTOM_GROUP_ID,
  type CustomWorkspaceGroups
} from '../custom-workspace-groups'
import type { OccurrenceSectionPath, WorktreeOccurrenceSection } from '../worktree-occurrence-plan'
import type { Worktree } from '../worktree/types'
import type { SectionAppendContext } from './group-sections'
import type { Row, WorktreeGroupBy } from './row-types'
import { ALL_GROUP_KEY, PINNED_GROUP_KEY } from './group-keys'
import { getLaneHostWorktreeCounts, getLaneHostWorktreeIds } from './host-labels'
import { appendWorktreeRows, buildFolderWorkspaceRow } from './row-builders'
import {
  compareFolderWorkspacesForDisplay,
  type RenderableFolderWorkspace
} from './folder-workspace-lanes'

export type CustomGroupRowsContext = Pick<
  SectionAppendContext,
  | 'result'
  | 'repoOf'
  | 'defaultHostId'
  | 'collapsedGroups'
  | 'occurrencePlan'
  | 'mixedWorktreeHostContextLabels'
  | 'showEmptyCustomGroups'
>
type Bucket<T> = { name: string; items: T[] }

export type { CustomWorkspaceGroups }

export type RenderOptions = {
  /** Show empty custom groups as drop targets while a drag is active. */
  showEmptyCustomGroups?: boolean
}

/** Custom subgroups replace the saved grouping with their own parent grouping. */
export function getEffectiveGroupBy(
  groupBy: WorktreeGroupBy,
  customGroups: CustomWorkspaceGroups | undefined
): WorktreeGroupBy {
  return customGroups ? (getCustomParentGroupBy(customGroups) ?? 'none') : groupBy
}

/** Custom subgroup sections render through their parent group, never as groups of their own. */
export function isChild(section: { key: string }): boolean {
  return section.key.startsWith(CUSTOM_GROUP_KEY_PREFIX)
}

/** Adds each section's custom subgroups; the parent keeps no occurrences since every card renders in a subgroup. */
export function withCustomGroupSections<S extends WorktreeOccurrenceSection<Worktree>>(
  data: CustomWorkspaceGroups | undefined,
  sections: S[]
): S[] {
  if (!data) {
    return sections
  }
  return sections.flatMap((section): S[] => {
    if (section.key === PINNED_GROUP_KEY) {
      return [section]
    }
    const isFlat = section.key === ALL_GROUP_KEY
    const children = getCustomGroupOccurrenceSections(
      data,
      isFlat ? null : section.key,
      section.items,
      isFlat ? undefined : section.revealPath
    ).map((child) => ({ ...section, ...child }))
    return [{ ...section, items: [] }, ...children]
  })
}

/** Splits a section's cards into custom-group buckets; ungrouped is always present and first. */
function partitionByCustomGroup<T>(
  data: CustomWorkspaceGroups,
  items: readonly T[],
  identityOf: (item: T) => Worktree
): Map<string, Bucket<T>> {
  const buckets = new Map<string, Bucket<T>>([
    [UNGROUPED_CUSTOM_GROUP_ID, { name: 'Ungrouped', items: [] }]
  ])
  for (const group of data.groups) {
    buckets.set(group.id, { name: group.name, items: [] })
  }
  for (const item of items) {
    // The id is only returned for a group that still exists, so its bucket is always present.
    buckets
      .get(getCustomWorkspaceGroupId(data, identityOf(item)) ?? UNGROUPED_CUSTOM_GROUP_ID)!
      .items.push(item)
  }
  return buckets
}

/** Occurrence sections for one parent section's custom subgroups, so rows and reveal share one plan. */
export function getCustomGroupOccurrenceSections(
  data: CustomWorkspaceGroups,
  parentKey: string | null,
  items: readonly Worktree[],
  parentPath: OccurrenceSectionPath | undefined
): WorktreeOccurrenceSection<Worktree>[] {
  return [...partitionByCustomGroup(data, items, (item) => item)].map(([id, bucket]) => {
    const key = customGroupChildKey(id, parentKey)
    // Ungrouped cards render without their own collapsible tier.
    const revealPath = id === UNGROUPED_CUSTOM_GROUP_ID ? parentPath : { key, parent: parentPath }
    return { key, items: bucket.items, revealPath: revealPath ?? { key } }
  })
}

export function appendCustomGroupRows(
  ctx: CustomGroupRowsContext,
  data: CustomWorkspaceGroups,
  worktrees: readonly Worktree[],
  folders: readonly RenderableFolderWorkspace[],
  parentKey: string | null = null,
  groupDepth = parentKey === null ? 0 : 1,
  hostContextLabelByRepoId?: ReadonlyMap<string, string>
): void {
  const worktreeBuckets = partitionByCustomGroup(data, worktrees, (item) => item)
  const folderBuckets = partitionByCustomGroup(data, folders, (folder) =>
    folderWorkspaceToWorktree(folder.folderWorkspace)
  )
  const bucketOf = (id: string) => ({
    name: worktreeBuckets.get(id)!.name,
    items: worktreeBuckets.get(id)!.items,
    folders: folderBuckets.get(id)!.items
  })
  const options = { groupDepth, hostContextLabelByRepoId }
  // Why: ungrouped cards sit one level up, before any sticky group header that could claim them.
  const ungrouped = bucketOf(UNGROUPED_CUSTOM_GROUP_ID)
  const ungroupedKey = customGroupChildKey(UNGROUPED_CUSTOM_GROUP_ID, parentKey)
  // Why: top-level ungrouped has no parent header to drop on, so expose one while dragging.
  if (
    ungrouped.items.length + ungrouped.folders.length === 0 &&
    parentKey === null &&
    ctx.showEmptyCustomGroups
  ) {
    ctx.result.push(buildBucketHeader(ctx, ungroupedKey, ungrouped, groupDepth))
  }
  appendBucketRows(ctx, ungrouped, ungroupedKey, {
    ...options,
    groupDepth: Math.max(0, groupDepth - 1)
  })
  for (const group of data.groups) {
    const bucket = bucketOf(group.id)
    // Why: empty groups only matter as drop targets, so they appear just during a drag.
    if (bucket.items.length + bucket.folders.length === 0 && !ctx.showEmptyCustomGroups) {
      continue
    }
    const key = customGroupChildKey(group.id, parentKey)
    ctx.result.push(buildBucketHeader(ctx, key, bucket, groupDepth))
    if (!ctx.collapsedGroups.has(key)) {
      appendBucketRows(ctx, bucket, key, options)
    }
  }
}

type RowBucket = {
  name: string
  items: Worktree[]
  folders: RenderableFolderWorkspace[]
}

/** Short alias for the row planner, whose file sits at its line cap. */
export const appendRows = appendCustomGroupRows

function buildBucketHeader(
  ctx: CustomGroupRowsContext,
  key: string,
  bucket: RowBucket,
  groupDepth: number
): Row {
  return {
    type: 'header',
    key,
    label: bucket.name,
    count: bucket.items.length + bucket.folders.length,
    customGroup: true,
    projectGroupDepth: groupDepth,
    icon: { kind: 'project' },
    worktreeIds: bucket.items.map((worktree) => worktree.id),
    hostWorktreeCounts: getLaneHostWorktreeCounts(
      bucket.items,
      bucket.folders,
      ctx.repoOf,
      ctx.defaultHostId
    ),
    hostWorktreeIds: getLaneHostWorktreeIds(
      bucket.items,
      bucket.folders,
      ctx.repoOf,
      ctx.defaultHostId
    )
  }
}

function appendBucketRows(
  ctx: CustomGroupRowsContext,
  bucket: RowBucket,
  key: string,
  options: {
    groupDepth: number
    hostContextLabelByRepoId?: ReadonlyMap<string, string>
  }
): void {
  appendWorktreeRows(ctx.result, ctx.repoOf, ctx.occurrencePlan, {
    collapsedGroups: ctx.collapsedGroups,
    groupDepth: options.groupDepth,
    sectionKey: key,
    hostContextLabelByRepoId: options.hostContextLabelByRepoId,
    hostContextLabelByWorktreeIdentity: ctx.mixedWorktreeHostContextLabels
  })
  for (const folder of [...bucket.folders].sort((a, b) =>
    compareFolderWorkspacesForDisplay(a.folderWorkspace, b.folderWorkspace)
  )) {
    ctx.result.push({
      ...buildFolderWorkspaceRow(folder, options.groupDepth),
      sectionKey: key
    })
  }
}
