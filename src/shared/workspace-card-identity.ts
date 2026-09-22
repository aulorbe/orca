import type { Worktree } from './worktree/types'
import { composeWorktreeHostIdentity } from './worktree/host-qualified-identity'

export type WorkspaceCardIdentity = Pick<
  Worktree,
  'id' | 'hostId' | 'instanceId' | 'priorWorktreeIds'
>

export function getWorkspaceCardKey(workspace: WorkspaceCardIdentity): string {
  return composeWorktreeHostIdentity(
    workspace.hostId,
    workspace.instanceId ? `instance:${workspace.instanceId}` : workspace.id
  )
}

export function getWorkspaceCardKeys(workspace: WorkspaceCardIdentity): string[] {
  return [
    getWorkspaceCardKey(workspace),
    ...(workspace.priorWorktreeIds ?? []).map((id) =>
      composeWorktreeHostIdentity(workspace.hostId, id)
    )
  ]
}
