import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  assignWorkspaceTag,
  EMPTY_WORKSPACE_TAGS,
  normalizeWorkspaceTags,
  saveWorkspaceTag,
  type TaggedWorkspace,
  type WorkspaceTag,
  type WorkspaceTags
} from '../../../shared/workspace-tags'

type WorkspaceTagsState = {
  data: WorkspaceTags
  addTag: (tag: WorkspaceTag, workspace: TaggedWorkspace) => void
  assignTag: (workspace: TaggedWorkspace, tagId: string, selected: boolean) => void
  selectFilter: (tagId: string, selected: boolean) => void
  clearFilter: () => void
}

// Renderer storage is isolated by the application's user-data directory, just like its theme.
export const useWorkspaceTagsStore = create<WorkspaceTagsState>()(
  persist(
    (set) => ({
      data: EMPTY_WORKSPACE_TAGS,
      addTag: (tag, workspace) =>
        set((state) => ({
          data: assignWorkspaceTag(saveWorkspaceTag(state.data, tag), workspace, tag.id, true)
        })),
      assignTag: (workspace, tagId, selected) =>
        set((state) => ({
          data: assignWorkspaceTag(state.data, workspace, tagId, selected)
        })),
      selectFilter: (tagId, selected) =>
        set(({ data }) => ({
          data: {
            ...data,
            filterIds: selected
              ? [...new Set([...data.filterIds, tagId])]
              : data.filterIds.filter((id) => id !== tagId)
          }
        })),
      clearFilter: () => set(({ data }) => ({ data: { ...data, filterIds: [] } }))
    }),
    {
      name: 'orca-workspace-tags',
      partialize: ({ data }) => ({ data }),
      merge: (persisted, current) => ({
        ...current,
        data: normalizeWorkspaceTags(
          persisted && typeof persisted === 'object' && 'data' in persisted
            ? persisted.data
            : undefined
        )
      })
    }
  )
)
