import { describe, expect, it } from 'vitest'
import {
  assignCustomWorkspaceGroup,
  deleteCustomWorkspaceGroup,
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  getCustomWorkspaceGroupId,
  getCustomWorkspaceGroupKey,
  moveCustomWorkspaceGroup,
  placeCustomWorkspaceGroup,
  normalizeCustomWorkspaceGroups,
  saveCustomWorkspaceGroup,
  type CustomWorkspaceGroups
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

describe('placeCustomWorkspaceGroup', () => {
  const state: CustomWorkspaceGroups = {
    enabled: true,
    groups: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id.toUpperCase() })),
    assignments: { card: 'b' }
  }
  const order = (next: CustomWorkspaceGroups) => next.groups.map((group) => group.id)

  it('places a group before or after a visible anchor, skipping hidden groups in between', () => {
    expect(order(placeCustomWorkspaceGroup(state, 'd', 'a', 'before'))).toEqual([
      'd',
      'a',
      'b',
      'c'
    ])
    expect(order(placeCustomWorkspaceGroup(state, 'a', 'c', 'after'))).toEqual(['b', 'c', 'a', 'd'])
    // 'b' and 'c' may be hidden (empty) in the sidebar; dropping 'a' after 'd' still lands last.
    expect(order(placeCustomWorkspaceGroup(state, 'a', 'd', 'after'))).toEqual(['b', 'c', 'd', 'a'])
    expect(placeCustomWorkspaceGroup(state, 'd', 'a', 'before').assignments).toBe(state.assignments)
  })

  it('returns the same state for no-op, self, or unknown moves', () => {
    expect(placeCustomWorkspaceGroup(state, 'b', 'a', 'after')).toBe(state)
    expect(placeCustomWorkspaceGroup(state, 'b', 'b', 'before')).toBe(state)
    expect(placeCustomWorkspaceGroup(state, 'missing', 'a', 'before')).toBe(state)
    expect(placeCustomWorkspaceGroup(state, 'a', 'missing', 'before')).toBe(state)
  })
})
