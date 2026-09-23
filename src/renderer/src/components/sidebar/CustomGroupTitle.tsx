import { useRef, useState } from 'react'
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

export function CustomGroupTitle({ groupKey, name }: { groupKey: string; name: string }) {
  const [beginEditing, setBeginEditing] = useState(false)
  const menuRequestedEdit = useRef(false)
  const id = parseCustomGroupSectionKey(groupKey)?.groupId
  if (!id) {
    return <span className="truncate">{name}</span>
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex min-w-0 flex-1" onClick={(event) => event.stopPropagation()}>
          <WorktreeTitleInlineRename
            displayName={name}
            inputLabel="Rename group"
            className="text-[13px] font-semibold"
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
