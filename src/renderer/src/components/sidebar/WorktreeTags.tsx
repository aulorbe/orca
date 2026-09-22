import { useId, useRef, useState } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import { useWorkspaceTagsStore } from '@/store/workspace-tags'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ColorPicker } from '@/components/ui/color-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DEFAULT_REPO_BADGE_COLOR } from '../../../../shared/constants'
import {
  getWorkspaceTagIds,
  getWorkspaceTags,
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

export function WorktreeTags({
  worktree,
  onOpen
}: {
  worktree: TaggedWorkspace
  onOpen?: () => void
}) {
  const state = useWorkspaceTagsStore((s) => s.data)
  const addTag = useWorkspaceTagsStore((s) => s.addTag)
  const assignTag = useWorkspaceTagsStore((s) => s.assignTag)
  const tags = getWorkspaceTags(state, worktree)
  const selectedIds = getWorkspaceTagIds(state, worktree)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(DEFAULT_REPO_BADGE_COLOR)
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
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          onOpen?.()
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="shrink-0"
              aria-label={
                tags.length ? `Edit tags: ${tags.map((tag) => tag.name).join(', ')}` : 'Add tags'
              }
              data-workspace-board-preserve-open=""
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              {tags.length ? (
                <span className="flex items-center gap-1" data-worktree-tags="">
                  {tags.map((tag) => (
                    <WorkspaceTagDot key={tag.id} tag={tag} />
                  ))}
                </span>
              ) : (
                <Tag className="size-3 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {tags.length ? tags.map((tag) => tag.name).join(', ') : 'Add tags'}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-72"
        align="start"
        data-workspace-board-preserve-open=""
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (
            event.key === 'Escape' &&
            event.target instanceof Node &&
            event.currentTarget.contains(event.target)
          ) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
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
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </div>
          {state.definitions.length > 0 && (
            <div className="scrollbar-sleek max-h-48 space-y-2 overflow-y-auto">
              {state.definitions.map((tag) => (
                <Label key={tag.id}>
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
  )
}
