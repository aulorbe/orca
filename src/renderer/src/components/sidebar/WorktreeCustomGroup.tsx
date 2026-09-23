import { useId } from 'react'
import { toast } from 'sonner'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { useAppStore } from '@/store'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  getCustomWorkspaceGroupId,
  UNGROUPED_CUSTOM_GROUP_ID
} from '../../../../shared/custom-workspace-groups'
import { getCustomWorkspaceRevealKeys } from './custom-group-parent-key'
import type { WorkspaceCardIdentity } from '../../../../shared/workspace-card-identity'

export function WorktreeCustomGroup({
  worktree,
  onOpenChange
}: {
  worktree: WorkspaceCardIdentity
  onOpenChange: (open: boolean) => void
}) {
  const data = useCustomWorkspaceGroups((s) => s.data)
  const assignGroup = useCustomWorkspaceGroups((s) => s.assignGroup)
  const id = useId()
  if (data.groups.length === 0) {
    return null
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>Custom group</Label>
      <Select
        value={getCustomWorkspaceGroupId(data, worktree) ?? UNGROUPED_CUSTOM_GROUP_ID}
        onOpenChange={onOpenChange}
        onValueChange={(value) => {
          try {
            assignGroup(worktree, value === UNGROUPED_CUSTOM_GROUP_ID ? null : value)
            const groups = useCustomWorkspaceGroups.getState().data
            const ui = useAppStore.getState()
            const current = ui.getKnownWorktreeById(worktree.id, worktree.hostId)
            for (const key of current ? getCustomWorkspaceRevealKeys(ui, current) : []) {
              if (groups.enabled && ui.collapsedGroups.has(key)) {
                ui.toggleCollapsedGroup(key)
              }
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not change group.')
          }
        }}
      >
        <SelectTrigger id={id} className="w-full" data-workspace-board-preserve-open="">
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-workspace-board-preserve-open="">
          <SelectItem value={UNGROUPED_CUSTOM_GROUP_ID}>Ungrouped</SelectItem>
          {data.groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
