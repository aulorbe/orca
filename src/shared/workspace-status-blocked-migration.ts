import { BLOCKED_WORKSPACE_STATUS } from './workspace-status-defaults'
import type { WorkspaceStatusDefinition } from './worktree/types'

/** Used once per saved profile; later user edits/removals remain authoritative. */
export function addDefaultBlockedWorkspaceStatus(
  statuses: readonly WorkspaceStatusDefinition[]
): WorkspaceStatusDefinition[] {
  if (statuses.some((status) => status.id === BLOCKED_WORKSPACE_STATUS.id)) {
    return [...statuses]
  }
  const progress = statuses.findIndex((status) => status.id === 'in-progress')
  const trailing = statuses.findIndex(
    (status) => status.id === 'in-review' || status.id === 'completed'
  )
  const index = progress !== -1 ? progress + 1 : trailing !== -1 ? trailing : statuses.length
  return [...statuses.slice(0, index), { ...BLOCKED_WORKSPACE_STATUS }, ...statuses.slice(index)]
}
