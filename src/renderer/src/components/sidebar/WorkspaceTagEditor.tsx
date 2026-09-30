import { useEffect, useId, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useWorkspaceTagsStore } from '@/store/workspace-tags'
import { createBrowserUuid } from '@/lib/browser-uuid'
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
import {
  getWorkspaceTagIds,
  nextWorkspaceTagColor,
  WORKSPACE_TAG_NAME_LIMIT,
  type TaggedWorkspace,
  type WorkspaceTag
} from '../../../../shared/workspace-tags'
import { WorkspaceTagDot } from './WorkspaceTagDot'
import { SortableWorkspaceTagList } from './SortableWorkspaceTagList'

export function WorkspaceTagEditor({
  worktree,
  onClose,
  onDeletePendingChange,
  onKeepOpenChange
}: {
  worktree: TaggedWorkspace
  onClose: () => void
  onDeletePendingChange?: (pending: boolean) => void
  /** True while typing a new tag or dragging to reorder, so hover surfaces stay open. */
  onKeepOpenChange?: (keepOpen: boolean) => void
}) {
  const state = useWorkspaceTagsStore((s) => s.data)
  const addTag = useWorkspaceTagsStore((s) => s.addTag)
  const assignTag = useWorkspaceTagsStore((s) => s.assignTag)
  const deleteTag = useWorkspaceTagsStore((s) => s.deleteTag)
  const moveTag = useWorkspaceTagsStore((s) => s.moveTag)
  const [formFocused, setFormFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const keepOpen = formFocused || dragging
  useEffect(() => {
    onKeepOpenChange?.(keepOpen)
  }, [keepOpen, onKeepOpenChange])
  const selectedIds = getWorkspaceTagIds(state, worktree)
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(() => nextWorkspaceTagColor(state))
  const [pendingDelete, setPendingDeleteState] = useState<WorkspaceTag | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nameId = useId()
  const setPendingDelete = (tag: WorkspaceTag | null) => {
    setPendingDeleteState(tag)
    onDeletePendingChange?.(tag !== null)
  }
  const run = (operation: () => void) => {
    setError(null)
    try {
      operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save tags. Try again.')
    }
  }
  return (
    <>
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Tags</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Close tags"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        {state.definitions.length > 0 && (
          <div className="scrollbar-sleek max-h-48 space-y-2 overflow-y-auto">
            <SortableWorkspaceTagList
              tags={state.definitions}
              onMove={(tagId, toIndex) => run(() => moveTag(tagId, toIndex))}
              onDraggingChange={setDragging}
              renderRow={(tag) => (
                <>
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
                </>
              )}
            />
          </div>
        )}
        <form
          className="space-y-2"
          onFocus={() => setFormFocused(true)}
          onBlur={() => setFormFocused(false)}
          onSubmit={(event) => {
            event.preventDefault()
            run(() => {
              addTag({ id: createBrowserUuid(), name, color }, worktree)
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
