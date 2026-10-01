import { BLOCKED_WORKSPACE_STATUS } from './workspace-status-defaults'
import type { WorkspaceStatusDefinition } from './worktree/types'

/** Used once per saved profile; later user edits/removals remain authoritative. */
export function addDefaultBlockedWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[]
): WorkspaceStatusDefinition[] {
  if (statuses.some((status) => status.id === BLOCKED_WORKSPACE_STATUS.id)) {
    return [...statuses]
  }
  // Why: Blocked sits after In review (before Done); fall back to before Done, then after In progress.
  const review = statuses.findIndex((status) => status.id === 'in-review')
  const done = statuses.findIndex((status) => status.id === 'completed')
  const progress = statuses.findIndex((status) => status.id === 'in-progress')
  const index =
    review !== -1
      ? review + 1
      : done !== -1
        ? done
        : progress !== -1
          ? progress + 1
          : statuses.length
  return [...statuses.slice(0, index), { ...BLOCKED_WORKSPACE_STATUS }, ...statuses.slice(index)]
}
