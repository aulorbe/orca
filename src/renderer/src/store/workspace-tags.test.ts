// @vitest-environment happy-dom
import { beforeEach, expect, it } from 'vitest'
import { EMPTY_WORKSPACE_TAGS, getWorkspaceTags } from '../../../shared/workspace-tags'
import { useWorkspaceTagsStore } from './workspace-tags'

const workspace = { id: 'repo::/worktree', hostId: 'local' as const }
const tag = { id: 'urgent', name: 'Urgent', color: '#ef4444' }

beforeEach(() => {
  localStorage.clear()
  useWorkspaceTagsStore.setState({ data: EMPTY_WORKSPACE_TAGS })
})

it('persists assignments and tag filters and restores them after rehydration', async () => {
  useWorkspaceTagsStore.getState().addTag(tag, workspace)
  useWorkspaceTagsStore.getState().selectFilter(tag.id, true)
  const saved = localStorage.getItem('orca-workspace-tags')
  expect(saved).not.toBeNull()
  useWorkspaceTagsStore.setState({ data: EMPTY_WORKSPACE_TAGS })
  localStorage.setItem('orca-workspace-tags', saved ?? '')
  await useWorkspaceTagsStore.persist.rehydrate()
  expect(getWorkspaceTags(useWorkspaceTagsStore.getState().data, workspace)).toEqual([tag])
  expect(useWorkspaceTagsStore.getState().data.filterIds).toEqual([tag.id])
  useWorkspaceTagsStore.getState().clearFilter()
  expect(useWorkspaceTagsStore.getState().data.filterIds).toEqual([])
})

it('keeps quick successive selections and removes an assignment independently', () => {
  const second = { id: 'review', name: 'Review', color: '#3b82f6' }
  const actions = useWorkspaceTagsStore.getState()
  actions.addTag(tag, workspace)
  actions.addTag(second, workspace)
  actions.selectFilter(tag.id, true)
  actions.selectFilter(second.id, true)
  expect(useWorkspaceTagsStore.getState().data.filterIds).toEqual([tag.id, second.id])
  actions.assignTag(workspace, tag.id, false)
  expect(getWorkspaceTags(useWorkspaceTagsStore.getState().data, workspace)).toEqual([second])
})
