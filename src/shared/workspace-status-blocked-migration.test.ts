import { expect, it } from 'vitest'
import { addDefaultBlockedWorkspaceStatus } from './workspace-status-blocked-migration'
import {
  cloneDefaultWorkspaceStatuses,
  getWorkspaceStatus,
  normalizeWorkspaceStatuses
} from './workspace-statuses'

it('provides Blocked as a native status without making it the default for new cards', () => {
  const statuses = cloneDefaultWorkspaceStatuses()
  expect(statuses.find((status) => status.id === 'blocked')).toEqual({
    id: 'blocked',
    label: 'Blocked',
    color: 'rose',
    icon: 'ban'
  })
  expect(getWorkspaceStatus({}, statuses)).toBe('in-progress')
  expect(getWorkspaceStatus({ workspaceStatus: 'blocked' }, statuses)).toBe('blocked')
})

it('adds Blocked after In progress without replacing customized labels, colors, or order', () => {
  const authored = [
    { id: 'completed', label: 'Shipped', color: 'blue' },
    { id: 'in-progress', label: 'Building', icon: 'timer' },
    { id: 'todo', label: 'Queue' }
  ]
  const next = addDefaultBlockedWorkspaceStatus(authored)
  expect(next.map((status) => status.id)).toEqual(['completed', 'in-progress', 'blocked', 'todo'])
  expect(next.filter((status) => status.id !== 'blocked')).toEqual(authored)
  expect(authored).toHaveLength(3)
  expect(addDefaultBlockedWorkspaceStatus(next)).toEqual(next)
})

it('preserves an existing blocked status and allows subsequent explicit removal', () => {
  const authored = [{ id: 'blocked', label: 'Waiting', color: 'amber', icon: 'circle-pause' }]
  expect(addDefaultBlockedWorkspaceStatus(authored)).toEqual(authored)
  const withoutBlocked = cloneDefaultWorkspaceStatuses().filter((status) => status.id !== 'blocked')
  expect(normalizeWorkspaceStatuses(withoutBlocked)).toEqual(withoutBlocked)
})
