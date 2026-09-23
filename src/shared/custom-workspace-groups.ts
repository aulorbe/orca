import { z } from 'zod'
import type { WorkspaceStatusDefinition, Worktree } from './worktree/types'
import {
  cloneDefaultWorkspaceStatuses,
  getWorkspaceStatus,
  getWorkspaceStatusGroupKey
} from './workspace-statuses'
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
  byStatus: z.boolean().optional(),
  parentGroupBy: z.enum(['none', 'workspace-status', 'pr-status', 'repo']).nullable().optional(),
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
    ...(parsed.data.byStatus ? { byStatus: true } : {}),
    ...(parsed.data.parentGroupBy !== undefined
      ? { parentGroupBy: parsed.data.parentGroupBy }
      : {}),
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

export function getCustomParentGroupBy(
  state: CustomWorkspaceGroups
): NonNullable<CustomWorkspaceGroups['parentGroupBy']> | null {
  return state.parentGroupBy !== undefined
    ? state.parentGroupBy
    : state.byStatus
      ? 'workspace-status'
      : null
}

export function customGroupChildKey(groupId: string | null, parentKey: string | null): string {
  if (parentKey === null) {
    return customGroupSectionKey(groupId)
  }
  if (parentKey.startsWith('workspace-status:')) {
    return customGroupSectionKey(
      groupId,
      decodeURIComponent(parentKey.slice('workspace-status:'.length))
    )
  }
  return `${CUSTOM_GROUP_KEY_PREFIX}within/${encodeURIComponent(parentKey)}/${encodeURIComponent(groupId ?? UNGROUPED_CUSTOM_GROUP_ID)}`
}

export function customGroupSectionKey(
  groupId: string | null,
  statusId: string | null = null
): string {
  const id = groupId ?? UNGROUPED_CUSTOM_GROUP_ID
  return statusId === null
    ? `${CUSTOM_GROUP_KEY_PREFIX}${id}`
    : `${CUSTOM_GROUP_KEY_PREFIX}status/${encodeURIComponent(statusId)}/${encodeURIComponent(id)}`
}

export function parseCustomGroupSectionKey(
  key: string
): { groupId: string | null; statusId: string | null; parentKey: string | null } | null {
  if (!key.startsWith(CUSTOM_GROUP_KEY_PREFIX)) {
    return null
  }
  const suffix = key.slice(CUSTOM_GROUP_KEY_PREFIX.length)
  try {
    const parts = suffix.split('/')
    const nested = (parts[0] === 'status' || parts[0] === 'within') && parts.length === 3
    const id = nested ? decodeURIComponent(parts[2]!) : suffix
    const parent = nested ? decodeURIComponent(parts[1]!) : null
    const statusId = nested && parts[0] === 'status' ? parent : null
    const parentKey = statusId !== null ? getWorkspaceStatusGroupKey(statusId) : parent
    if (!id || (nested && !parent)) {
      return null
    }
    return { groupId: id === UNGROUPED_CUSTOM_GROUP_ID ? null : id, statusId, parentKey }
  } catch {
    return null
  }
}

export function getCustomWorkspaceGroupKey(
  state: CustomWorkspaceGroups,
  workspace: WorkspaceCardIdentity & Pick<Worktree, 'workspaceStatus'>,
  statuses: readonly WorkspaceStatusDefinition[] = cloneDefaultWorkspaceStatuses()
): string {
  return customGroupSectionKey(
    getCustomWorkspaceGroupId(state, workspace),
    getCustomParentGroupBy(state) === 'workspace-status'
      ? getWorkspaceStatus(workspace, statuses)
      : null
  )
}

export function getCustomWorkspaceGroupKeys(
  state: CustomWorkspaceGroups,
  workspace: WorkspaceCardIdentity & Pick<Worktree, 'workspaceStatus'>,
  statuses: readonly WorkspaceStatusDefinition[] = cloneDefaultWorkspaceStatuses()
): string[] {
  const key = getCustomWorkspaceGroupKey(state, workspace, statuses)
  return getCustomParentGroupBy(state) === 'workspace-status'
    ? [getWorkspaceStatusGroupKey(getWorkspaceStatus(workspace, statuses)), key]
    : [key]
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
  return assignCustomWorkspacesGroup(state, [workspace], groupId)
}

export function assignCustomWorkspacesGroup(
  state: CustomWorkspaceGroups,
  workspaces: readonly WorkspaceCardIdentity[],
  groupId: string | null
): CustomWorkspaceGroups {
  if (groupId !== null && !state.groups.some((group) => group.id === groupId)) {
    throw new Error('Group no longer exists.')
  }
  const assignments = { ...state.assignments }
  for (const workspace of workspaces) {
    for (const key of getWorkspaceCardKeys(workspace)) {
      delete assignments[key]
    }
    if (groupId !== null) {
      assignments[getWorkspaceCardKey(workspace)] = groupId
    }
  }
  return { ...state, assignments }
}

export function deleteCustomWorkspaceGroup(
  state: CustomWorkspaceGroups,
  groupId: string,
  destination: string | null = null
): CustomWorkspaceGroups {
  if (
    destination === groupId ||
    (destination !== null && !state.groups.some((group) => group.id === destination))
  ) {
    throw new Error('Choose another existing group or Ungrouped.')
  }
  const assignments = Object.fromEntries(
    Object.entries(state.assignments).flatMap(([key, id]) => {
      if (id !== groupId) {
        return [[key, id]]
      }
      return destination === null ? [] : [[key, destination]]
    })
  )
  return normalizeCustomWorkspaceGroups({
    ...state,
    assignments,
    groups: state.groups.filter((group) => group.id !== groupId)
  })
}

export function clearDeletedCustomGroupAssignments(
  state: CustomWorkspaceGroups,
  groupId: string,
  workspaces: readonly WorkspaceCardIdentity[]
): CustomWorkspaceGroups {
  const keys = new Set(workspaces.flatMap(getWorkspaceCardKeys))
  return {
    ...state,
    assignments: Object.fromEntries(
      Object.entries(state.assignments).filter(([key, id]) => id !== groupId || !keys.has(key))
    )
  }
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
