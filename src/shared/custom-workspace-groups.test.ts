import { describe, expect, it } from 'vitest'
import {
  assignCustomWorkspaceGroup,
  deleteCustomWorkspaceGroup,
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  getCustomWorkspaceGroupId,
  getCustomWorkspaceGroupKey,
  moveCustomWorkspaceGroup,
  normalizeCustomWorkspaceGroups,
  saveCustomWorkspaceGroup
} from './custom-workspace-groups'

const frontend = { id: 'frontend', name: 'Frontend' }
const infrastructure = { id: 'infrastructure', name: 'Infrastructure' }
const card = { id: 'repo::/worktree', instanceId: 'one', hostId: 'local' as const }
const groups = () =>
  saveCustomWorkspaceGroup(
    saveCustomWorkspaceGroup(EMPTY_CUSTOM_WORKSPACE_GROUPS, frontend),
    infrastructure
  )

describe('custom workspace groups', () => {
  it('assigns one group per card without changing the card or its status', () => {
    const first = assignCustomWorkspaceGroup(groups(), card, frontend.id)
    const second = assignCustomWorkspaceGroup(first, card, infrastructure.id)
    expect(getCustomWorkspaceGroupId(second, card)).toBe(infrastructure.id)
    expect(Object.values(second.assignments)).toEqual([infrastructure.id])
    expect(
      getCustomWorkspaceGroupId(assignCustomWorkspaceGroup(second, card, null), card)
    ).toBeNull()
    expect(getCustomWorkspaceGroupKey(groups(), card)).toBe('custom-group:ungrouped')
  })

  it('keeps assignments across renames, but separates hosts and replacement instances', () => {
    const state = assignCustomWorkspaceGroup(groups(), card, frontend.id)
    expect(getCustomWorkspaceGroupId(state, { ...card, id: 'repo::/renamed' })).toBe(frontend.id)
    expect(getCustomWorkspaceGroupId(state, { ...card, hostId: 'ssh:box' })).toBeNull()
    expect(getCustomWorkspaceGroupId(state, { ...card, instanceId: 'replacement' })).toBeNull()
  })

  it('renames and reorders groups while preserving assignments', () => {
    const state = assignCustomWorkspaceGroup(groups(), card, frontend.id)
    const renamed = saveCustomWorkspaceGroup(state, { ...frontend, name: 'Web' })
    const moved = moveCustomWorkspaceGroup(renamed, infrastructure.id, -1)
    expect(moved.groups.map((group) => group.name)).toEqual(['Infrastructure', 'Web'])
    expect(getCustomWorkspaceGroupId(moved, card)).toBe(frontend.id)
    expect(moveCustomWorkspaceGroup(moved, infrastructure.id, -1)).toBe(moved)
  })

  it('deleting a group leaves its cards ungrouped and does not affect other groups', () => {
    const state = assignCustomWorkspaceGroup(groups(), card, frontend.id)
    const deleted = deleteCustomWorkspaceGroup(state, frontend.id)
    expect(deleted.groups).toEqual([infrastructure])
    expect(deleted.assignments).toEqual({})
    expect(getCustomWorkspaceGroupId(deleted, card)).toBeNull()
  })

  it('validates names and normalizes stored data', () => {
    expect(() => saveCustomWorkspaceGroup(groups(), { id: 'other', name: ' frontend ' })).toThrow(
      'already in use'
    )
    expect(() => saveCustomWorkspaceGroup(groups(), { id: 'other', name: 'Ungrouped' })).toThrow(
      'already in use'
    )
    expect(() => saveCustomWorkspaceGroup(groups(), { id: 'other', name: ' ' })).toThrow(
      'Enter a group name'
    )
    expect(normalizeCustomWorkspaceGroups(null)).toEqual(EMPTY_CUSTOM_WORKSPACE_GROUPS)
    expect(
      normalizeCustomWorkspaceGroups({ ...groups(), assignments: { unknown: 'removed' } })
        .assignments
    ).toEqual({})
  })
})
