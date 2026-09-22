import { useId, useRef, useState } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import { useWorkspaceTagsStore } from '@/store/workspace-tags'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ColorPicker } from '@/components/ui/color-picker'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getWorkspaceTagIds,
  getWorkspaceTags,
  nextWorkspaceTagColor,
  WORKSPACE_TAG_NAME_LIMIT,
  type TaggedWorkspace,
  type WorkspaceTag
} from '../../../../shared/workspace-tags'

export function WorkspaceTagDot({ tag }: { tag: WorkspaceTag }) {
  return (
    <span
      role="img"
      aria-label={tag.name}
      className="size-2.5 shrink-0 rounded-full border border-foreground/30"
      style={{ backgroundColor: tag.color }}
    />
  )
}

export function WorktreeTagDots({ worktree }: { worktree: TaggedWorkspace }) {
  const state = useWorkspaceTagsStore((s) => s.data)
  const tags = getWorkspaceTags(state, worktree)
  if (tags.length === 0) {
    return null
  }
  const names = tags.map((tag) => tag.name).join(', ')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex shrink-0 items-center gap-1"
          data-worktree-tags=""
          tabIndex={0}
          aria-label={`Tags: ${names}`}
        >
          {tags.map((tag) => (
            <WorkspaceTagDot key={tag.id} tag={tag} />
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent>{names}</TooltipContent>
    </Tooltip>
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
  const addTag = useWorkspaceTagsStore((s) => s.addTag)
  const assignTag = useWorkspaceTagsStore((s) => s.assignTag)
  const deleteTag = useWorkspaceTagsStore((s) => s.deleteTag)
  const tags = getWorkspaceTags(state, worktree)
  const selectedIds = getWorkspaceTagIds(state, worktree)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(() => nextWorkspaceTagColor(state))
  const [pendingDelete, setPendingDelete] = useState<WorkspaceTag | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nameId = useId()
  const run = (operation: () => void) => {
    setError(null)
    try {
      operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save tags. Try again.')
    }
  }
  const changeOpen = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }
  return (
    <>
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
            if (pendingDelete) {
              event.preventDefault()
            }
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Escape' &&
              event.target instanceof Node &&
              event.currentTarget.contains(event.target)
            ) {
              event.preventDefault()
              event.stopPropagation()
              changeOpen(false)
            } else if (event.key !== 'Escape') {
              event.stopPropagation()
            }
          }}
        >
          <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Tags</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Close tags"
                onClick={() => changeOpen(false)}
              >
                <X />
              </Button>
            </div>
            {state.definitions.length > 0 && (
              <div className="scrollbar-sleek max-h-48 space-y-2 overflow-y-auto">
                {state.definitions.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    <Label className="min-w-0 flex-1">
                      <Checkbox
                        aria-label={tag.name}
                        checked={selectedIds.includes(tag.id)}
                        onCheckedChange={(checked) =>
                          run(() => assignTag(worktree, tag.id, checked === true))
                        }
                      />
                      <WorkspaceTagDot tag={tag} />
                      <span className="min-w-0 truncate">{tag.name}</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete tag ${tag.name}`}
                      onClick={() => {
                        setError(null)
                        setPendingDelete(tag)
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                run(() => {
                  addTag({ id: crypto.randomUUID(), name, color }, worktree)
                  setName('')
                  setColor(nextWorkspaceTagColor(useWorkspaceTagsStore.getState().data))
                  inputRef.current?.focus()
                })
              }}
            >
              <Label htmlFor={nameId}>New tag</Label>
              <Input
                ref={inputRef}
                id={nameId}
                placeholder="Tag name"
                value={name}
                maxLength={WORKSPACE_TAG_NAME_LIMIT}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                <ColorPicker value={color} onChange={setColor} label="Tag color" />
                <Button type="submit" size="sm" disabled={!name.trim()}>
                  <Plus />
                  Add
                </Button>
              </div>
            </form>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) {
            setPendingDelete(null)
          }
        }}
      >
        <DialogContent data-workspace-board-preserve-open="">
          <DialogHeader>
            <DialogTitle>Delete tag “{pendingDelete?.name}”?</DialogTitle>
            <DialogDescription>
              This removes the tag from every card. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                run(() => {
                  if (pendingDelete) {
                    deleteTag(pendingDelete.id)
                    setPendingDelete(null)
                    setColor(nextWorkspaceTagColor(useWorkspaceTagsStore.getState().data))
                  }
                })
              }
            >
              Delete tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
