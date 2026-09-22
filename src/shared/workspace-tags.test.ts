import { describe, expect, it } from 'vitest'
import {
  assignWorkspaceTag,
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
