import { describe, expect, it } from 'vitest'
import {
  assignWorkspaceTag,
  deleteWorkspaceTag,
  nextWorkspaceTagColor,
  EMPTY_WORKSPACE_TAGS,
  getWorkspaceTags,
  getWorkspaceTagKey,
  normalizeWorkspaceTags,
  saveWorkspaceTag,
  workspaceMatchesTagFilter
} from './workspace-tags'

const workspace = { id: 'repo::/worktree', hostId: 'local' as const, instanceId: 'one' }
const urgent = { id: 'urgent', name: 'Urgent', color: '#ef4444' }
const review = { id: 'review', name: 'Review', color: '#3b82f6' }

function tagged() {
  return assignWorkspaceTag(
    saveWorkspaceTag(EMPTY_WORKSPACE_TAGS, urgent),
    workspace,
    urgent.id,
    true
  )
}

describe('workspace tags', () => {
  it('adds and removes a colored tag without changing its definition', () => {
    const state = tagged()
    expect(getWorkspaceTags(state, workspace)).toEqual([urgent])
    expect(
      getWorkspaceTags(assignWorkspaceTag(state, workspace, urgent.id, false), workspace)
    ).toEqual([])
    expect(state.definitions).toEqual([urgent])
  })

  it('keeps hosts and replacement workspace instances separate, but survives a rename', () => {
    const state = tagged()
    expect(getWorkspaceTags(state, { ...workspace, hostId: 'ssh:box' })).toEqual([])
    expect(getWorkspaceTags(state, { ...workspace, instanceId: 'replacement' })).toEqual([])
    expect(getWorkspaceTags(state, { ...workspace, id: 'repo::/renamed' })).toEqual([urgent])
  })

  it('accepts folder workspaces without git fields', () => {
    const folder = { id: 'folder:one', hostId: 'local' as const }
    const state = assignWorkspaceTag(tagged(), folder, urgent.id, true)
    expect(getWorkspaceTags(state, folder)).toEqual([urgent])
  })

  it('matches any selected tag, and shows every workspace when cleared', () => {
    const state = saveWorkspaceTag(tagged(), review)
    expect(workspaceMatchesTagFilter(workspace, { ...state, filterIds: [review.id] })).toBe(false)
    expect(
      workspaceMatchesTagFilter(workspace, { ...state, filterIds: [review.id, urgent.id] })
    ).toBe(true)
    expect(workspaceMatchesTagFilter({ id: 'untagged' }, state)).toBe(true)
  })

  it.each(['#aabbcc', '#AABBCC', '#abc'])('rejects the same normalized hex color: %s', (color) => {
    const state = saveWorkspaceTag(EMPTY_WORKSPACE_TAGS, {
      id: 'one',
      name: 'One',
      color: '#aabbcc'
    })
    expect(() => saveWorkspaceTag(state, { id: 'two', name: 'Two', color })).toThrow(
      'hex color is already used'
    )
  })

  it('offers an unused default color for the next tag', () => {
    const color = nextWorkspaceTagColor(EMPTY_WORKSPACE_TAGS)
    const state = saveWorkspaceTag(EMPTY_WORKSPACE_TAGS, { id: 'one', name: 'One', color })
    expect(nextWorkspaceTagColor(state)).not.toBe(color)
  })

  it('deletes a tag from all cards and filters, freeing its color for reuse', () => {
    const other = { id: 'other', hostId: 'local' as const }
    const state = assignWorkspaceTag(saveWorkspaceTag(tagged(), review), other, urgent.id, true)
    const deleted = deleteWorkspaceTag({ ...state, filterIds: [urgent.id, review.id] }, urgent.id)
    expect(deleted.definitions).toEqual([review])
    expect(deleted.assignments).toEqual({})
    expect(deleted.filterIds).toEqual([review.id])
    expect(() => saveWorkspaceTag(deleted, { ...urgent, id: 'replacement' })).not.toThrow()
  })

  it('validates names and colors and rejects duplicate names', () => {
    expect(() => saveWorkspaceTag(tagged(), { ...review, name: ' urgent ' })).toThrow(
      'already exists'
    )
    expect(() => saveWorkspaceTag(tagged(), { ...review, name: ' ' })).toThrow('Enter a tag name')
    expect(() => saveWorkspaceTag(tagged(), { ...review, color: 'red' })).toThrow('valid color')
  })

  it('restores persisted data while dropping dangling assignments and filters', () => {
    const state = normalizeWorkspaceTags({
      definitions: [urgent],
      assignments: { [getWorkspaceTagKey(workspace)]: ['urgent', 'urgent', 'removed'] },
      filterIds: ['urgent', 'removed']
    })
    expect(getWorkspaceTags(state, workspace)).toEqual([urgent])
    expect(state.filterIds).toEqual(['urgent'])
    expect(normalizeWorkspaceTags(null)).toEqual(EMPTY_WORKSPACE_TAGS)
  })
})
