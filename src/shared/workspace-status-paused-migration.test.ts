import { expect, it } from 'vitest'
import { addDefaultPausedWorkspaceStatus } from './workspace-status-paused-migration'
import { cloneDefaultWorkspaceStatuses, getWorkspaceStatus } from './workspace-statuses'

it('provides Paused as a native status after Blocked without making it the default', () => {
  const statuses = cloneDefaultWorkspaceStatuses()
  expect(statuses.map((status) => status.id)).toEqual([
    'todo',
    'in-progress',
    'in-review',
    'blocked',
    'paused',
    'completed'
  ])
  expect(statuses.find((status) => status.id === 'paused')).toEqual({
    id: 'paused',
    label: 'Paused',
    color: 'amber',
    icon: 'circle-pause'
  })
  expect(getWorkspaceStatus({}, statuses)).toBe('in-progress')
})

it('adds Paused after Blocked (else before Done, else last) and keeps authored statuses', () => {
  const authored = [
    { id: 'blocked', label: 'Stuck', color: 'rose', icon: 'ban' },
    { id: 'completed', label: 'Shipped', color: 'blue', icon: 'circle-check' }
  ]
  const next = addDefaultPausedWorkspaceStatus(authored)
  expect(next.map((status) => status.id)).toEqual(['blocked', 'paused', 'completed'])
  expect(next.filter((status) => status.id !== 'paused')).toEqual(authored)
  expect(addDefaultPausedWorkspaceStatus(next)).toEqual(next)
  expect(addDefaultPausedWorkspaceStatus([authored[1]!]).map((status) => status.id)).toEqual([
    'paused',
    'completed'
  ])
  const custom = [{ id: 'todo', label: 'Queue', color: 'neutral', icon: 'circle' }]
  expect(addDefaultPausedWorkspaceStatus(custom).map((status) => status.id)).toEqual([
    'todo',
    'paused'
  ])
})
