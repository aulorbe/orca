import React from 'react'
import type { TaggedWorkspace } from '../../../../shared/workspace-tags'
import { WorktreeCustomGroup } from './WorktreeCustomGroup'
import { WorktreeTags } from './WorktreeTags'

export type OrganizeEditors = {
  /** True while the tag editor or group picker is open, so the hover card stays pinned. */
  editorOpen: boolean
  setTagEditorOpen: (open: boolean) => void
  setGroupPickerOpen: (open: boolean) => void
}

export function useOrganizeEditors(): OrganizeEditors {
  const [tagEditorOpen, setTagEditorOpen] = React.useState(false)
  const [groupPickerOpen, setGroupPickerOpen] = React.useState(false)
  return { editorOpen: tagEditorOpen || groupPickerOpen, setTagEditorOpen, setGroupPickerOpen }
}

/** Fork: the custom-group picker and tag editor at the bottom of a card's hover details. */
export function WorktreeCardOrganize({
  worktree,
  editors
}: {
  worktree?: TaggedWorkspace
  editors: OrganizeEditors
}): React.ReactElement | null {
  if (!worktree) {
    return null
  }
  return (
    <>
      <WorktreeCustomGroup worktree={worktree} onOpenChange={editors.setGroupPickerOpen} />
      <WorktreeTags worktree={worktree} onOpenChange={editors.setTagEditorOpen} />
    </>
  )
}
