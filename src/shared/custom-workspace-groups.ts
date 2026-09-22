import { z } from 'zod'
import {
  getWorkspaceCardKey,
  getWorkspaceCardKeys,
  type WorkspaceCardIdentity
} from './workspace-card-identity'

export const CUSTOM_GROUP_NAME_LIMIT = 40
export const CUSTOM_GROUP_KEY_PREFIX = 'custom-group:'
export const UNGROUPED_CUSTOM_GROUP_ID = 'ungrouped'

const GroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(CUSTOM_GROUP_NAME_LIMIT)
})
const GroupsSchema = z.object({
  enabled: z.boolean(),
  groups: z.array(GroupSchema),
  assignments: z.record(z.string(), z.string())
})
export type CustomWorkspaceGroup = z.infer<typeof GroupSchema>
export type CustomWorkspaceGroups = z.infer<typeof GroupsSchema>
export const EMPTY_CUSTOM_WORKSPACE_GROUPS: CustomWorkspaceGroups = {
  enabled: false,
  groups: [],
  assignments: {}
}

export function normalizeCustomWorkspaceGroups(value: unknown): CustomWorkspaceGroups {
  const parsed = GroupsSchema.safeParse(value)
  if (!parsed.success) {
    return EMPTY_CUSTOM_WORKSPACE_GROUPS
  }
  const ids = new Set<string>()
  const names = new Set<string>()
  const groups = parsed.data.groups.filter((group) => {
    const name = group.name.toLowerCase()
    if (group.id === UNGROUPED_CUSTOM_GROUP_ID || ids.has(group.id) || names.has(name)) {
      return false
    }
    ids.add(group.id)
    names.add(name)
    return true
  })
  return {
    enabled: parsed.data.enabled,
    groups,
    assignments: Object.fromEntries(
      Object.entries(parsed.data.assignments).filter(([, id]) => ids.has(id))
    )
  }
}

export function getCustomWorkspaceGroupId(
  state: CustomWorkspaceGroups,
  workspace: WorkspaceCardIdentity
): string | null {
  for (const key of getWorkspaceCardKeys(workspace)) {
    const id = state.assignments[key]
    if (id && state.groups.some((group) => group.id === id)) {
      return id
    }
  }
  return null
}

export function getCustomWorkspaceGroupKey(
  state: CustomWorkspaceGroups,
  workspace: WorkspaceCardIdentity
): string {
  return `${CUSTOM_GROUP_KEY_PREFIX}${getCustomWorkspaceGroupId(state, workspace) ?? UNGROUPED_CUSTOM_GROUP_ID}`
}

export function saveCustomWorkspaceGroup(
  state: CustomWorkspaceGroups,
  group: CustomWorkspaceGroup
): CustomWorkspaceGroups {
  const parsed = GroupSchema.safeParse(group)
  if (!parsed.success) {
    throw new Error('Enter a group name (up to 40 characters).')
  }
  const name = parsed.data.name.toLowerCase()
  if (
    name === 'ungrouped' ||
    state.groups.some((other) => other.id !== group.id && other.name.toLowerCase() === name)
  ) {
    throw new Error('That group name is already in use.')
  }
  return {
    ...state,
    groups: state.groups.some((other) => other.id === group.id)
      ? state.groups.map((other) => (other.id === group.id ? parsed.data : other))
      : [...state.groups, parsed.data]
  }
}

export function assignCustomWorkspaceGroup(
  state: CustomWorkspaceGroups,
  workspace: WorkspaceCardIdentity,
  groupId: string | null
): CustomWorkspaceGroups {
  if (groupId !== null && !state.groups.some((group) => group.id === groupId)) {
    throw new Error('Group no longer exists.')
  }
  const assignments = { ...state.assignments }
  for (const key of getWorkspaceCardKeys(workspace)) {
    delete assignments[key]
  }
  if (groupId !== null) {
    assignments[getWorkspaceCardKey(workspace)] = groupId
  }
  return { ...state, assignments }
}

export function deleteCustomWorkspaceGroup(
  state: CustomWorkspaceGroups,
  groupId: string
): CustomWorkspaceGroups {
  return normalizeCustomWorkspaceGroups({
    ...state,
    groups: state.groups.filter((group) => group.id !== groupId)
  })
}

export function moveCustomWorkspaceGroup(
  state: CustomWorkspaceGroups,
  groupId: string,
  direction: -1 | 1
): CustomWorkspaceGroups {
  const index = state.groups.findIndex((group) => group.id === groupId)
  const target = index + direction
  if (index === -1 || target < 0 || target >= state.groups.length) {
    return state
  }
  const groups = [...state.groups]
  ;[groups[index], groups[target]] = [groups[target]!, groups[index]!]
  return { ...state, groups }
}
