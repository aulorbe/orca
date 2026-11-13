import { PAUSED_WORKSPACE_STATUS } from './workspace-status-defaults'
import type { WorkspaceStatusDefinition } from './worktree/types'

/** Used once per saved profile; later user edits/removals remain authoritative. */
export function addDefaultPausedWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[]
): WorkspaceStatusDefinition[] {
  if (statuses.some((status) => status.id === PAUSED_WORKSPACE_STATUS.id)) {
    return [...statuses]
  }
  // Why: Paused sits after Blocked (before Done); fall back to before Done, then the end.
  const blocked = statuses.findIndex((status) => status.id === 'blocked')
  const done = statuses.findIndex((status) => status.id === 'completed')
  const index = blocked !== -1 ? blocked + 1 : done !== -1 ? done : statuses.length
  return [...statuses.slice(0, index), { ...PAUSED_WORKSPACE_STATUS }, ...statuses.slice(index)]
}
