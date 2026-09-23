import { useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CustomGroupDeletionChoices } from './CustomGroupDeletionChoices'
import {
  CUSTOM_GROUP_NAME_LIMIT,
  type CustomWorkspaceGroup
} from '../../../../shared/custom-workspace-groups'

export function CustomGroupsManager({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const groups = useCustomWorkspaceGroups((s) => s.data.groups)
  const byStatus = useCustomWorkspaceGroups((s) => s.data.byStatus)
  const saveGroup = useCustomWorkspaceGroups((s) => s.saveGroup)
  const moveGroup = useCustomWorkspaceGroups((s) => s.moveGroup)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CustomWorkspaceGroup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const reset = () => {
    setName('')
    setEditingId(null)
    setError(null)
  }
  const run = (action: () => void) => {
    setError(null)
    try {
      action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save groups.')
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
          setPendingDelete(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent data-workspace-board-preserve-open="">
        <DialogHeader>
          <DialogTitle>
            {pendingDelete ? `Delete group “${pendingDelete.name}”?` : 'Custom groups'}
          </DialogTitle>
          <DialogDescription>
            {pendingDelete
              ? 'Choose what happens to this group’s cards.'
              : byStatus
                ? 'Groups are shared across statuses. Each card keeps its status unless you drag it to another status.'
                : 'Create your own groups, then choose a group in each card’s hover details.'}
          </DialogDescription>
        </DialogHeader>
        {pendingDelete ? (
          <CustomGroupDeletionChoices
            groupId={pendingDelete.id}
            onCancel={() => setPendingDelete(null)}
            onMoved={() => {
              if (editingId === pendingDelete.id) {
                reset()
              }
              setPendingDelete(null)
            }}
            onReviewOpened={() => {
              reset()
              setPendingDelete(null)
              onOpenChange(false)
            }}
          />
        ) : (
          <>
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                run(() => {
                  saveGroup({ id: editingId ?? crypto.randomUUID(), name })
                  reset()
                  input.current?.focus()
                })
              }}
            >
              <Label htmlFor={inputId}>{editingId ? 'Rename group' : 'New group'}</Label>
              <div className="flex gap-2">
                <Input
                  ref={input}
                  id={inputId}
                  value={name}
                  maxLength={CUSTOM_GROUP_NAME_LIMIT}
                  placeholder="Group name"
                  onChange={(event) => setName(event.target.value)}
                />
                <Button type="submit" disabled={!name.trim()}>
                  {editingId ? 'Save' : 'Add group'}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={reset}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
            <div className="scrollbar-sleek max-h-72 space-y-2 overflow-y-auto">
              {groups.map((group, index) => {
                const actions = [
                  {
                    label: `Rename ${group.name}`,
                    icon: Pencil,
                    disabled: false,
                    run: () => {
                      setEditingId(group.id)
                      setName(group.name)
                      input.current?.focus()
                    }
                  },
                  {
                    label: `Move ${group.name} up`,
                    icon: ArrowUp,
                    disabled: index === 0,
                    run: () => moveGroup(group.id, -1)
                  },
                  {
                    label: `Move ${group.name} down`,
                    icon: ArrowDown,
                    disabled: index === groups.length - 1,
                    run: () => moveGroup(group.id, 1)
                  },
                  {
                    label: `Delete group ${group.name}`,
                    icon: Trash2,
                    disabled: false,
                    run: () => setPendingDelete(group)
                  }
                ]
                return (
                  <div key={group.id} className="flex items-center gap-2" data-custom-group-row="">
                    <span className="min-w-0 flex-1 truncate text-sm">{group.name}</span>
                    {actions.map((action) => (
                      <Tooltip key={action.label}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={action.disabled}
                            aria-label={action.label}
                            onClick={() => run(action.run)}
                          >
                            <action.icon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{action.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )
              })}
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
