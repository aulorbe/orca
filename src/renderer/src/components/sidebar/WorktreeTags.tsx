import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import { useWorkspaceTagsStore } from '@/store/workspace-tags'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getWorkspaceTags, type TaggedWorkspace } from '../../../../shared/workspace-tags'
import { WorkspaceTagDot } from './WorkspaceTagDot'
import { WorkspaceTagEditor } from './WorkspaceTagEditor'

// Why: keep sidebar/terminal shortcuts from firing while typing; Escape closes only this editor.
function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>, close: () => void) {
  if (event.key !== 'Escape') {
    event.stopPropagation()
  } else if (event.target instanceof Node && event.currentTarget.contains(event.target)) {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}

export function WorktreeTagDots({
  worktree,
  onEditorOpenChange,
  onPointerOverChange
}: {
  worktree: TaggedWorkspace
  onEditorOpenChange?: (open: boolean) => void
  onPointerOverChange?: (over: boolean) => void
}) {
  const state = useWorkspaceTagsStore((s) => s.data)
  const tags = getWorkspaceTags(state, worktree)
  const [hovered, setHovered] = useState(false)
  const [keepOpen, setKeepOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  // Why: typing a new tag or confirming a delete must survive the pointer drifting off the card.
  const open = hovered || keepOpen || deletePending
  useEffect(() => {
    onEditorOpenChange?.(open)
  }, [onEditorOpenChange, open])
  useEffect(() => () => onEditorOpenChange?.(false), [onEditorOpenChange])
  useEffect(() => () => onPointerOverChange?.(false), [onPointerOverChange])
  // Why: stay mounted while open so unchecking the last tag doesn't yank the editor away.
  if (tags.length === 0 && !open) {
    return null
  }
  const names = tags.map((tag) => tag.name).join(', ')
  const close = () => {
    setHovered(false)
    setKeepOpen(false)
  }
  return (
    <HoverCard open={open} onOpenChange={setHovered} openDelay={250} closeDelay={150}>
      <HoverCardTrigger asChild>
        <span
          className="flex shrink-0 items-center gap-1"
          data-worktree-tags=""
          data-workspace-board-preserve-open=""
          tabIndex={0}
          aria-label={`Tags: ${names}`}
          onPointerEnter={() => onPointerOverChange?.(true)}
          onPointerLeave={() => onPointerOverChange?.(false)}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {tags.map((tag) => (
            <WorkspaceTagDot key={tag.id} tag={tag} />
          ))}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        className="w-72 p-0"
        data-worktree-tag-hover-editor=""
        data-workspace-board-preserve-open=""
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => handleEditorKeyDown(event, close)}
        onInteractOutside={(event) => {
          if (deletePending) {
            event.preventDefault()
          } else {
            close()
          }
        }}
      >
        <WorkspaceTagEditor
          worktree={worktree}
          onClose={close}
          onKeepOpenChange={setKeepOpen}
          onDeletePendingChange={setDeletePending}
        />
      </HoverCardContent>
    </HoverCard>
  )
}

export function WorktreeTags({
  worktree,
  onOpenChange
}: {
  worktree: TaggedWorkspace
  onOpenChange?: (open: boolean) => void
}) {
  const state = useWorkspaceTagsStore((s) => s.data)
  const tags = getWorkspaceTags(state, worktree)
  const [open, setOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const changeOpen = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          data-workspace-board-preserve-open=""
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Tag className="size-3 text-muted-foreground" />
          {tags.length ? 'Edit tags' : 'Add tags'}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72"
        align="start"
        data-workspace-board-preserve-open=""
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onInteractOutside={(event) => {
          if (deletePending) {
            event.preventDefault()
          }
        }}
        onKeyDown={(event) => handleEditorKeyDown(event, () => changeOpen(false))}
      >
        <WorkspaceTagEditor
          worktree={worktree}
          onClose={() => changeOpen(false)}
          onDeletePendingChange={setDeletePending}
        />
      </PopoverContent>
    </Popover>
  )
}
