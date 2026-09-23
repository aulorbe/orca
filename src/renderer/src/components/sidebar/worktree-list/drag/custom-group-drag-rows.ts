import type { HostSectionRow } from '../../host-section-rows'
import { folderWorkspaceToWorktree } from '../../../../../../shared/folder-workspace-worktree'
import { CUSTOM_GROUP_KEY_PREFIX } from '../../../../../../shared/custom-workspace-groups'

/** Let custom-group folder cards use the same pointer session and geometry as worktree cards. */
export function customGroupDragRows(rows: readonly HostSectionRow[]): HostSectionRow[] {
  return rows.map((row) => {
    if (row.type !== 'folder-workspace' || !row.sectionKey?.startsWith(CUSTOM_GROUP_KEY_PREFIX)) {
      return row
    }
    const worktree = folderWorkspaceToWorktree(row.folderWorkspace)
    return {
      type: 'item',
      rowKey: worktree.id,
      sectionKey: row.sectionKey,
      worktree,
      repo: undefined,
      depth: 0,
      groupDepth: row.groupDepth,
      lineageTrail: [],
      isLastLineageChild: false,
      lineageChildCount: 0
    }
  })
}
