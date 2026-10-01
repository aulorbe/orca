import { useEffect, useRef, useState } from 'react'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { WorktreeTitleInlineRename } from './WorktreeTitleInlineRename'
import { stopRepoHeaderKeyboardToggle } from './worktree-list/rows/header-event-guards'
import { parseCustomGroupSectionKey } from '../../../../shared/custom-workspace-groups'

// Why: longer than a typical double-click gap, so a rename double-click never toggles first.
const TITLE_TOGGLE_DELAY_MS = 250

export function CustomGroupTitle({
  groupKey,
  name,
  onToggle
}: {
  groupKey: string
  name: string
  onToggle: () => void
}) {
  const [beginEditing, setBeginEditing] = useState(false)
  const menuRequestedEdit = useRef(false)
  const toggleTimer = useRef<number | null>(null)
  const cancelToggle = () => {
    if (toggleTimer.current !== null) {
      window.clearTimeout(toggleTimer.current)
      toggleTimer.current = null
    }
  }
  useEffect(() => cancelToggle, [])
  const id = parseCustomGroupSectionKey(groupKey)?.groupId
  if (!id) {
    return <span className="truncate">{name}</span>
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="flex min-w-0 flex-1 cursor-pointer"
          onClick={(event) => {
            event.stopPropagation()
            cancelToggle()
            if (event.detail <= 1) {
              toggleTimer.current = window.setTimeout(() => {
                toggleTimer.current = null
                onToggle()
              }, TITLE_TOGGLE_DELAY_MS)
            }
          }}
          onDoubleClick={cancelToggle}
        >
          <WorktreeTitleInlineRename
            displayName={name}
            inputLabel="Rename group"
            className="text-[13px] font-medium text-foreground/80"
            editingClassName="flex-1"
            beginEditing={beginEditing}
            onBeginEditingConsumed={() => setBeginEditing(false)}
            onRename={(nextName) => {
              const state = useCustomWorkspaceGroups.getState()
              if (!state.data.groups.some((group) => group.id === id)) {
                throw new Error('Group no longer exists.')
              }
              state.saveGroup({ id, name: nextName })
            }}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        data-workspace-board-preserve-open=""
        onClick={(event) => event.stopPropagation()}
        onKeyDown={stopRepoHeaderKeyboardToggle}
        onCloseAutoFocus={(event) => {
          if (menuRequestedEdit.current) {
            event.preventDefault()
            menuRequestedEdit.current = false
          }
        }}
      >
        <ContextMenuItem
          onSelect={() => {
            menuRequestedEdit.current = true
            setBeginEditing(true)
          }}
        >
          Edit
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
