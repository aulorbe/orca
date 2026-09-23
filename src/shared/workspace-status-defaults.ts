import type { WorkspaceStatusDefinition } from './worktree/types'

export const BLOCKED_WORKSPACE_STATUS = {
  id: 'blocked',
  label: 'Blocked',
  color: 'rose',
  icon: 'ban'
} as const satisfies WorkspaceStatusDefinition

export const DEFAULT_STATUS_VISUALS: Record<string, { color: string; icon: string }> = {
  todo: { color: 'neutral', icon: 'circle' },
  'in-progress': { color: 'conductor-progress', icon: 'conductor-progress' },
  'in-review': { color: 'conductor-review', icon: 'conductor-review' },
  blocked: { color: BLOCKED_WORKSPACE_STATUS.color, icon: BLOCKED_WORKSPACE_STATUS.icon },
  completed: { color: 'conductor-done', icon: 'conductor-done' }
}

export const DEFAULT_WORKSPACE_STATUSES = [
  { id: 'todo', label: 'Todo', color: 'neutral', icon: 'circle' },
  {
    id: 'in-progress',
    label: 'In progress',
    color: 'conductor-progress',
    icon: 'conductor-progress'
  },
  BLOCKED_WORKSPACE_STATUS,
  { id: 'in-review', label: 'In review', color: 'conductor-review', icon: 'conductor-review' },
  { id: 'completed', label: 'Done', color: 'conductor-done', icon: 'conductor-done' }
] as const satisfies readonly WorkspaceStatusDefinition[]
