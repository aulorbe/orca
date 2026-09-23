// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import type { AppState } from '@/store/types'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import {
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  customGroupSectionKey,
  getCustomWorkspaceGroupId
} from '../../../../../../shared/custom-workspace-groups'
import { cloneDefaultWorkspaceStatuses } from '../../../../../../shared/workspace-statuses'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { worktree } from '../../worktree-list-groups-test-fixtures'

const mocks = vi.hoisted(() => ({ getState: vi.fn(), error: vi.fn() }))
vi.mock('@/store', () => ({ useAppStore: { getState: mocks.getState } }))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
import { commitCustomGroupDrop } from './custom-group-drop'

let cards: Worktree[]
const update = vi.fn<AppState['updateWorktreeMeta']>()
const toggle = vi.fn()
beforeEach(() => {
  cards = [{ ...worktree, hostId: 'local', instanceId: 'one', workspaceStatus: 'in-progress' }]
  const state = {
    worktreesByRepo: { repo: cards },
    folderWorkspaces: [],
    workspaceStatuses: cloneDefaultWorkspaceStatuses(),
    collapsedGroups: new Set(['workspace-status:in-review', 'custom-group:status/in-review/front']),
    toggleCollapsedGroup: toggle,
    getKnownWorktreeById: (id: string, hostId: string) =>
      cards.find((card) => card.id === id && card.hostId === hostId),
    updateWorktreeMeta: update
  }
  mocks.getState.mockReturnValue(state)
  mocks.error.mockClear()
  toggle.mockClear()
  update.mockReset().mockImplementation(async (id, changes, options) => {
    const card = state.getKnownWorktreeById(id, options?.executionHostId ?? 'local')
    if (card && (!options?.shouldApply || options.shouldApply(card))) {
      Object.assign(card, changes)
    }
    return { ok: true }
  })
  useCustomWorkspaceGroups.setState({
    data: {
      ...EMPTY_CUSTOM_WORKSPACE_GROUPS,
      enabled: true,
      byStatus: true,
      groups: [
        { id: 'front', name: 'Frontend' },
        { id: 'infra', name: 'Infrastructure' }
      ]
    }
  })
})

it('changes only membership within a status, but persists the new status when crossing statuses', async () => {
  const card = cards[0]!
  await commitCustomGroupDrop(
    { draggedWorkspaces: [card] },
    customGroupSectionKey('front', 'in-progress')
  )
  expect(update).not.toHaveBeenCalled()
  expect(getCustomWorkspaceGroupId(useCustomWorkspaceGroups.getState().data, card)).toBe('front')
  await commitCustomGroupDrop(
    { draggedWorkspaces: [card] },
    customGroupSectionKey('front', 'in-review')
  )
  expect(update).toHaveBeenCalledWith(
    card.id,
    { workspaceStatus: 'in-review' },
    expect.objectContaining({ executionHostId: 'local' })
  )
  expect(card.workspaceStatus).toBe('in-review')
  expect(toggle).toHaveBeenCalledWith('workspace-status:in-review')
  expect(toggle).toHaveBeenCalledWith('custom-group:status/in-review/front')
})

it('keeps failed moves in their previous group and reports the error', async () => {
  const card = cards[0]!
  useCustomWorkspaceGroups.getState().assignGroup(card, 'infra')
  update.mockResolvedValue({ ok: false, error: 'Host unavailable' })
  await commitCustomGroupDrop(
    { draggedWorkspaces: [card] },
    customGroupSectionKey('front', 'in-review')
  )
  expect(getCustomWorkspaceGroupId(useCustomWorkspaceGroups.getState().data, card)).toBe('infra')
  expect(mocks.error).toHaveBeenCalled()
})

it('routes same-id remote cards only to their owning host and skips replaced instances', async () => {
  const remote: Worktree = { ...cards[0]!, hostId: 'ssh:box' }
  cards.push(remote)
  await commitCustomGroupDrop(
    { draggedWorkspaces: [remote] },
    customGroupSectionKey(null, 'in-review')
  )
  expect(update).toHaveBeenCalledWith(
    remote.id,
    { workspaceStatus: 'in-review' },
    expect.objectContaining({ executionHostId: 'ssh:box' })
  )
  expect(cards[0]!.workspaceStatus).toBe('in-progress')
  update.mockClear()
  await commitCustomGroupDrop(
    { draggedWorkspaces: [{ ...remote, instanceId: 'old' }] },
    customGroupSectionKey('front', 'in-progress')
  )
  expect(update).not.toHaveBeenCalled()
})

it('does not overwrite a newer assignment when an older status write completes', async () => {
  const card = cards[0]!
  let finish: (() => void) | undefined
  update.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = () => resolve({ ok: true })
      })
  )
  const pending = commitCustomGroupDrop(
    { draggedWorkspaces: [card] },
    customGroupSectionKey('front', 'in-review')
  )
  await commitCustomGroupDrop(
    { draggedWorkspaces: [card] },
    customGroupSectionKey('infra', 'in-progress')
  )
  finish?.()
  await pending
  expect(getCustomWorkspaceGroupId(useCustomWorkspaceGroups.getState().data, card)).toBe('infra')
})
