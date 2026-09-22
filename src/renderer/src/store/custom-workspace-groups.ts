import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  assignCustomWorkspaceGroup,
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
  setEnabled: (enabled: boolean) => void
  saveGroup: (group: CustomWorkspaceGroup) => void
  deleteGroup: (id: string) => void
  moveGroup: (id: string, direction: -1 | 1) => void
  assignGroup: (workspace: WorkspaceCardIdentity, groupId: string | null) => void
}

export const useCustomWorkspaceGroups = create<CustomGroupsState>()(
  persist(
    (set) => ({
      data: EMPTY_CUSTOM_WORKSPACE_GROUPS,
      setEnabled: (enabled) => set(({ data }) => ({ data: { ...data, enabled } })),
      saveGroup: (group) => set(({ data }) => ({ data: saveCustomWorkspaceGroup(data, group) })),
      deleteGroup: (id) => set(({ data }) => ({ data: deleteCustomWorkspaceGroup(data, id) })),
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
