import { expect, it } from 'vitest'
import {
  customGroupSectionKey,
  customGroupChildKey,
  getCustomParentGroupBy,
  parseCustomGroupSectionKey,
  getCustomWorkspaceGroupKeys,
  normalizeCustomWorkspaceGroups,
  EMPTY_CUSTOM_WORKSPACE_GROUPS
} from './custom-workspace-groups'
import { cloneDefaultWorkspaceStatuses } from './workspace-statuses'

it('round-trips flat and nested keys without confusing status and group identifiers', () => {
  for (const groupId of [null, 'frontend', 'a/b:encoded%']) {
    for (const statusId of [null, 'in-progress', 'custom/status:%']) {
      expect(parseCustomGroupSectionKey(customGroupSectionKey(groupId, statusId))).toEqual({
        groupId,
        statusId,
        parentKey: statusId === null ? null : `workspace-status:${encodeURIComponent(statusId)}`
      })
    }
  }
  expect(parseCustomGroupSectionKey('repo:one')).toBeNull()
  expect(parseCustomGroupSectionKey('custom-group:status/%bad/front')).toBeNull()
})

it('round-trips project and PR parent keys and migrates the previous status preference', () => {
  for (const parentKey of ['repo:a/b:%', 'project:remote-box', 'pr:open']) {
    expect(parseCustomGroupSectionKey(customGroupChildKey('front', parentKey))).toEqual({
      groupId: 'front',
      parentKey,
      statusId: null
    })
  }
  expect(getCustomParentGroupBy({ ...EMPTY_CUSTOM_WORKSPACE_GROUPS, byStatus: true })).toBe(
    'workspace-status'
  )
  expect(
    getCustomParentGroupBy(
      normalizeCustomWorkspaceGroups({
        ...EMPTY_CUSTOM_WORKSPACE_GROUPS,
        byStatus: true,
        parentGroupBy: 'repo'
      })
    )
  ).toBe('repo')
})

it('preserves existing flat data and persists the opt-in status layout', () => {
  expect(normalizeCustomWorkspaceGroups(EMPTY_CUSTOM_WORKSPACE_GROUPS)).toEqual(
    EMPTY_CUSTOM_WORKSPACE_GROUPS
  )
  expect(
    normalizeCustomWorkspaceGroups({ ...EMPTY_CUSTOM_WORKSPACE_GROUPS, byStatus: true }).byStatus
  ).toBe(true)
})

it('reveals both ancestors and uses the same fallback for removed statuses as the sidebar', () => {
  const state = { ...EMPTY_CUSTOM_WORKSPACE_GROUPS, enabled: true, byStatus: true }
  expect(
    getCustomWorkspaceGroupKeys(
      state,
      { id: 'one', workspaceStatus: 'removed' },
      cloneDefaultWorkspaceStatuses()
    )
  ).toEqual(['workspace-status:in-progress', 'custom-group:status/in-progress/ungrouped'])
})
