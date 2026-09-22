import { z } from 'zod'
import { normalizeRepoBadgeColor } from './repo-badge-color'
import { DEFAULT_REPO_BADGE_COLOR, REPO_COLORS } from './constants'
import { composeWorktreeHostIdentity } from './worktree/host-qualified-identity'
import type { Worktree } from './worktree/types'

export const WORKSPACE_TAG_NAME_LIMIT = 40

export const WorkspaceTagSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(WORKSPACE_TAG_NAME_LIMIT),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
})
export const WorkspaceTagsSchema = z.object({
  definitions: z.array(WorkspaceTagSchema),
  assignments: z.record(z.string(), z.array(z.string())),
  filterIds: z.array(z.string())
})
export type WorkspaceTag = z.infer<typeof WorkspaceTagSchema>
export type WorkspaceTags = z.infer<typeof WorkspaceTagsSchema>
export type TaggedWorkspace = Pick<Worktree, 'id' | 'hostId' | 'instanceId' | 'priorWorktreeIds'>

export const EMPTY_WORKSPACE_TAGS: WorkspaceTags = {
  definitions: [],
  assignments: {},
  filterIds: []
}

export function normalizeWorkspaceTags(value: unknown): WorkspaceTags {
  const parsed = WorkspaceTagsSchema.safeParse(value)
  if (!parsed.success) {
    return EMPTY_WORKSPACE_TAGS
  }
  const ids = new Set<string>()
  const names = new Set<string>()
  const definitions = parsed.data.definitions.filter((tag) => {
    const name = tag.name.toLowerCase()
    if (ids.has(tag.id) || names.has(name)) {
      return false
    }
    ids.add(tag.id)
    names.add(name)
    return true
  })
  const knownIds = (values: string[]): string[] => [...new Set(values.filter((id) => ids.has(id)))]
  return {
    definitions,
    assignments: Object.fromEntries(
      Object.entries(parsed.data.assignments)
        .map(([key, values]) => [key, knownIds(values)] as const)
        .filter(([, values]) => values.length > 0)
    ),
    filterIds: knownIds(parsed.data.filterIds)
  }
}

export function getWorkspaceTagKey(workspace: TaggedWorkspace): string {
  return composeWorktreeHostIdentity(
    workspace.hostId,
    workspace.instanceId ? `instance:${workspace.instanceId}` : workspace.id
  )
}

function workspaceTagKeys(workspace: TaggedWorkspace): string[] {
  return [
    getWorkspaceTagKey(workspace),
    ...(workspace.priorWorktreeIds ?? []).map((id) =>
      composeWorktreeHostIdentity(workspace.hostId, id)
    )
  ]
}

export function getWorkspaceTagIds(state: WorkspaceTags, workspace: TaggedWorkspace): string[] {
  return [...new Set(workspaceTagKeys(workspace).flatMap((key) => state.assignments[key] ?? []))]
}

export function getWorkspaceTags(state: WorkspaceTags, workspace: TaggedWorkspace): WorkspaceTag[] {
  const ids = new Set(getWorkspaceTagIds(state, workspace))
  return state.definitions.filter((tag) => ids.has(tag.id))
}

export function workspaceMatchesTagFilter(
  workspace: TaggedWorkspace,
  state?: WorkspaceTags
): boolean {
  if (!state?.filterIds.length) {
    return true
  }
  const ids = new Set(getWorkspaceTagIds(state, workspace))
  return state.filterIds.some((id) => ids.has(id))
}

export function assignWorkspaceTag(
  state: WorkspaceTags,
  workspace: TaggedWorkspace,
  tagId: string,
  selected: boolean
): WorkspaceTags {
  if (!state.definitions.some((tag) => tag.id === tagId)) {
    throw new Error('Tag no longer exists.')
  }
  const ids = getWorkspaceTagIds(state, workspace).filter((id) => id !== tagId)
  if (selected) {
    ids.push(tagId)
  }
  const assignments = { ...state.assignments }
  for (const key of workspaceTagKeys(workspace)) {
    delete assignments[key]
  }
  if (ids.length > 0) {
    assignments[getWorkspaceTagKey(workspace)] = ids
  }
  return { ...state, assignments }
}

export function saveWorkspaceTag(state: WorkspaceTags, tag: WorkspaceTag): WorkspaceTags {
  const color = normalizeRepoBadgeColor(tag.color)
  const result = WorkspaceTagSchema.safeParse({ ...tag, color })
  if (!result.success) {
    throw new Error('Enter a tag name (up to 40 characters) and a valid color.')
  }
  const normalized = result.data
  if (
    state.definitions.some(
      (existing) =>
        existing.id !== tag.id && existing.name.toLowerCase() === normalized.name.toLowerCase()
    )
  ) {
    throw new Error('A tag with that name already exists.')
  }
  if (
    state.definitions.some(
      (existing) =>
        existing.id !== tag.id && normalizeRepoBadgeColor(existing.color) === normalized.color
    )
  ) {
    throw new Error('That hex color is already used by another tag. Choose a different color.')
  }
  const exists = state.definitions.some((existing) => existing.id === tag.id)
  return {
    ...state,
    definitions: exists
      ? state.definitions.map((existing) => (existing.id === tag.id ? normalized : existing))
      : [...state.definitions, normalized]
  }
}

export function deleteWorkspaceTag(state: WorkspaceTags, tagId: string): WorkspaceTags {
  return normalizeWorkspaceTags({
    ...state,
    definitions: state.definitions.filter((tag) => tag.id !== tagId)
  })
}

export function nextWorkspaceTagColor(state: WorkspaceTags): string {
  const used = new Set(state.definitions.map((tag) => normalizeRepoBadgeColor(tag.color)))
  return REPO_COLORS.find((color) => !used.has(color)) ?? DEFAULT_REPO_BADGE_COLOR
}
