import { useId, useState } from 'react'
import { useAppStore } from '@/store'
import { useAllWorktrees } from '@/store/selectors'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { folderWorkspaceToWorktree } from '../../../../shared/folder-workspace-worktree'
import { UNGROUPED_CUSTOM_GROUP_ID } from '../../../../shared/custom-workspace-groups'
import {
  customGroupDeletionPlan,
  requestCustomGroupWorkspaceDeletion
} from './custom-group-deletion'

export function CustomGroupDeletionChoices({
  groupId,
  onCancel,
  onMoved,
  onReviewOpened
}: {
  groupId: string
  onCancel: () => void
  onMoved: () => void
  onReviewOpened: () => void
}) {
  const data = useCustomWorkspaceGroups((s) => s.data)
  const deleteGroup = useCustomWorkspaceGroups((s) => s.deleteGroup)
  const worktrees = useAllWorktrees()
  const folders = useAppStore((s) => s.folderWorkspaces)
  const [action, setAction] = useState('move')
  const [destination, setDestination] = useState(UNGROUPED_CUSTOM_GROUP_ID)
  const [error, setError] = useState<string | null>(null)
  const actionId = useId()
  const destinationId = useId()
  const plan = customGroupDeletionPlan(data, groupId, [
    ...worktrees,
    ...folders.map(folderWorkspaceToWorktree)
  ])
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={actionId}>What happens to the cards?</Label>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger id={actionId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent data-workspace-board-preserve-open="">
            <SelectItem value="move">Move cards to another group</SelectItem>
            <SelectItem value="delete" disabled={plan.blockedReason !== null}>
              Delete workspaces too
            </SelectItem>
          </SelectContent>
        </Select>
        {action === 'move' ? (
          <>
            <Label htmlFor={destinationId}>Move cards to</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger id={destinationId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-workspace-board-preserve-open="">
                <SelectItem value={UNGROUPED_CUSTOM_GROUP_ID}>Ungrouped</SelectItem>
                {data.groups
                  .filter((group) => group.id !== groupId)
                  .map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <p className="text-sm text-destructive">
            You will review deletion of {plan.members.length} workspaces next. Their files and
            running terminals may be removed. The group stays if deletion is cancelled or fails.
          </p>
        )}
        {plan.blockedReason && (
          <p className="text-xs text-muted-foreground">{plan.blockedReason}</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setError(null)
            try {
              if (action === 'delete') {
                if (requestCustomGroupWorkspaceDeletion(groupId)) {
                  onReviewOpened()
                }
              } else {
                deleteGroup(groupId, destination === UNGROUPED_CUSTOM_GROUP_ID ? null : destination)
                onMoved()
              }
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Could not delete group.')
            }
          }}
        >
          {action === 'delete' ? 'Review workspace deletion…' : 'Delete group'}
        </Button>
      </DialogFooter>
    </>
  )
}
