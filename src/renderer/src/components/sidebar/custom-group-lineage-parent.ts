import type { CustomGroupParentResolver } from '../../../../shared/custom-workspace-groups'
import type { WorktreeLineage } from '../../../../shared/worktree/lineage-types'
import { getWorktreeHostIdentity } from '../../../../shared/worktree/host-qualified-identity'
import type { Worktree } from '../../../../shared/worktree/types'
import { getSidebarLineageParent } from './worktree-lineage-projection'

type WorktreeCollection = readonly Worktree[] | ReadonlyMap<string, Worktree>

// Why: resolvers are built per sidebar pass and per reveal; the catalog is an immutable,
// replaced-not-mutated store value, so its identity is a sound cache key.
const rowsByCatalog = new WeakMap<WorktreeCollection, Map<string, Worktree>>()

function getRowsByHostIdentity(catalog: WorktreeCollection): Map<string, Worktree> {
  let rows = rowsByCatalog.get(catalog)
  if (!rows) {
    const list = Array.isArray(catalog) ? catalog : [...catalog.values()]
    rows = new Map(list.map((worktree) => [getWorktreeHostIdentity(worktree), worktree]))
    rowsByCatalog.set(catalog, rows)
  }
  return rows
}

/**
 * Lets a child workspace (e.g. one an agent spawned with `orca worktree create`) inherit its
 * lineage parent's custom group. Uses the full catalog, not just visible rows, so a child still
 * inherits when its parent is pinned or sorted into another section.
 */
export function createCustomGroupParentResolver(
  lineageById: Readonly<Record<string, WorktreeLineage>>,
  catalog: WorktreeCollection
): CustomGroupParentResolver<Worktree> {
  const rows = getRowsByHostIdentity(catalog)
  return (worktree) => getSidebarLineageParent(worktree, lineageById, rows)
}
