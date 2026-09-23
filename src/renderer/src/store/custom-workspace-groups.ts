import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  assignCustomWorkspaceGroup,
  assignCustomWorkspacesGroup,
  clearDeletedCustomGroupAssignments,
  deleteCustomWorkspaceGroup,
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  moveCustomWorkspaceGroup,
  normalizeCustomWorkspaceGroups,
  saveCustomWorkspaceGroup,
  type CustomWorkspaceGroup,
  type CustomWorkspaceGroups
} from '../../../shared/custom-workspace-groups'
import type { WorkspaceCardIdentity } from '../../../shared/workspace-card-identity'

type CustomGroupsState = {
  data: CustomWorkspaceGroups
  managerOpen: boolean
  setManagerOpen: (open: boolean) => void
  setEnabled: (enabled: boolean) => void
  setByStatus: (byStatus: boolean) => void
  setParentGroupBy: (parentGroupBy: CustomWorkspaceGroups['parentGroupBy']) => void
  saveGroup: (group: CustomWorkspaceGroup) => void
  deleteGroup: (id: string, destination?: string | null) => void
  clearDeletedAssignments: (groupId: string, workspaces: readonly WorkspaceCardIdentity[]) => void
  assignWorkspaces: (workspaces: readonly WorkspaceCardIdentity[], groupId: string | null) => void
  moveGroup: (id: string, direction: -1 | 1) => void
  assignGroup: (workspace: WorkspaceCardIdentity, groupId: string | null) => void
}

export const useCustomWorkspaceGroups = create<CustomGroupsState>()(
  persist(
    (set) => ({
      data: EMPTY_CUSTOM_WORKSPACE_GROUPS,
      managerOpen: false,
      setManagerOpen: (managerOpen) => set({ managerOpen }),
      setEnabled: (enabled) => set(({ data }) => ({ data: { ...data, enabled } })),
      setByStatus: (byStatus) =>
        set(({ data }) => ({
          data: { ...data, byStatus, parentGroupBy: byStatus ? 'workspace-status' : null }
        })),
      setParentGroupBy: (parentGroupBy) =>
        set(({ data }) => ({
          data: { ...data, parentGroupBy, byStatus: parentGroupBy === 'workspace-status' }
        })),
      saveGroup: (group) => set(({ data }) => ({ data: saveCustomWorkspaceGroup(data, group) })),
      deleteGroup: (id, destination = null) =>
        set(({ data }) => ({ data: deleteCustomWorkspaceGroup(data, id, destination) })),
      clearDeletedAssignments: (id, workspaces) =>
        set(({ data }) => ({ data: clearDeletedCustomGroupAssignments(data, id, workspaces) })),
      assignWorkspaces: (workspaces, groupId) =>
        set(({ data }) => ({ data: assignCustomWorkspacesGroup(data, workspaces, groupId) })),
      moveGroup: (id, direction) =>
        set(({ data }) => ({ data: moveCustomWorkspaceGroup(data, id, direction) })),
      assignGroup: (workspace, groupId) =>
        set(({ data }) => ({ data: assignCustomWorkspaceGroup(data, workspace, groupId) }))
    }),
    {
      name: 'orca-custom-workspace-groups',
      partialize: ({ data }) => ({ data }),
      merge: (persisted, current) => ({
        ...current,
        data: normalizeCustomWorkspaceGroups(
          persisted && typeof persisted === 'object' && 'data' in persisted
            ? persisted.data
            : undefined
        )
      })
    }
  )
)
