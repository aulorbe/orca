import { describe, expect, it } from 'vitest'
import { buildRows } from './build-rows'
import { PINNED_GROUP_KEY } from './group-keys'
import { repoMap, worktree } from '../../worktree-list-groups-test-fixtures'
import {
  assignCustomWorkspaceGroup,
  type CustomWorkspaceGroups
} from '../../../../../../shared/custom-workspace-groups'
import { folderWorkspaceToWorktree } from '../../../../../../shared/folder-workspace-worktree'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../../../shared/project-group-types'
import type { Worktree } from '../../../../../../shared/worktree/types'

const data: CustomWorkspaceGroups = {
  enabled: true,
  groups: [
    { id: 'frontend', name: 'Frontend' },
    { id: 'infra', name: 'Infrastructure' }
  ],
  assignments: {}
}
const card: Worktree = { ...worktree, hostId: 'local', instanceId: 'one' }
const other: Worktree = { ...worktree, id: 'other', instanceId: 'two', hostId: 'local' }

function argsFor(
  state: CustomWorkspaceGroups,
  cards = [card, other],
  collapsed = new Set<string>()
) {
  const args: Parameters<typeof buildRows> = ['repo', cards, repoMap, null, collapsed]
  args[22] = state
  return args
}

describe('custom group rows', () => {
  it('uses the saved group order, keeps empty groups, and puts unassigned cards last', () => {
    const state = assignCustomWorkspaceGroup(data, card, 'frontend')
    const rows = buildRows(...argsFor(state))
    expect(
      rows.filter((row) => row.type === 'header').map((row) => [row.label, row.count])
    ).toEqual([
      ['Frontend', 1],
      ['Infrastructure', 0],
      ['Ungrouped', 1]
    ])
    expect(
      rows.filter((row) => row.type === 'item').map((row) => [row.worktree.id, row.sectionKey])
    ).toEqual([
      [card.id, 'custom-group:frontend'],
      [other.id, 'custom-group:ungrouped']
    ])
  })

  it('collapses a custom group without dropping its header or other cards', () => {
    const state = assignCustomWorkspaceGroup(data, card, 'frontend')
    const rows = buildRows(...argsFor(state, [card, other], new Set(['custom-group:frontend'])))
    expect(rows.filter((row) => row.type === 'item').map((row) => row.worktree.id)).toEqual([
      other.id
    ])
    expect(
      rows.find((row) => row.type === 'header' && row.key === 'custom-group:frontend')
    ).toMatchObject({ count: 1, customGroup: true })
  })

  it('preserves the pinned section and leaves native grouping unchanged when disabled', () => {
    const pinned = { ...card, isPinned: true }
    const rows = buildRows(
      ...argsFor(assignCustomWorkspaceGroup(data, pinned, 'frontend'), [pinned])
    )
    expect(rows.filter((row) => row.type === 'item').map((row) => row.sectionKey)).toEqual([
      PINNED_GROUP_KEY
    ])
    const native = buildRows(...argsFor({ ...data, enabled: false }))
    expect(native.some((row) => row.type === 'header' && row.customGroup)).toBe(false)
  })

  it('keeps same-path cards on different hosts in their assigned groups', () => {
    const remote: Worktree = { ...card, hostId: 'ssh:box' }
    const localAssigned = assignCustomWorkspaceGroup(data, card, 'frontend')
    const bothAssigned = assignCustomWorkspaceGroup(localAssigned, remote, 'infra')
    const rows = buildRows(...argsFor(bothAssigned, [card, remote]))
    expect(
      rows.filter((row) => row.type === 'item').map((row) => [row.worktree.hostId, row.sectionKey])
    ).toEqual([
      ['local', 'custom-group:frontend'],
      ['ssh:box', 'custom-group:infra']
    ])
  })

  it('groups folder workspaces even when there are no git worktrees', () => {
    const project: ProjectGroup = {
      id: 'project',
      name: 'Project',
      parentPath: '/folder',
      parentGroupId: null,
      createdFrom: 'folder-scan',
      tabOrder: 0,
      isCollapsed: false,
      color: null,
      createdAt: 1,
      updatedAt: 1
    }
    const folder: FolderWorkspace = {
      id: 'folder',
      projectGroupId: project.id,
      name: 'Folder',
      folderPath: '/folder',
      linkedTask: null,
      comment: '',
      isArchived: false,
      isUnread: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: 1,
      createdAt: 1,
      updatedAt: 1
    }
    const state = assignCustomWorkspaceGroup(data, folderWorkspaceToWorktree(folder), 'infra')
    const args = argsFor(state, [])
    args[12] = [project]
    args[18] = [folder]
    const rows = buildRows(...args)
    expect(rows.filter((row) => row.type === 'folder-workspace')).toHaveLength(1)
    expect(
      rows.find((row) => row.type === 'header' && row.key === 'custom-group:infra')
    ).toMatchObject({ count: 1 })
  })
})
