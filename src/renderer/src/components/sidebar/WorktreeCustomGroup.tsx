import { useId } from 'react'
import { toast } from 'sonner'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { useAppStore } from '@/store'
import { getAllWorktreesFromState } from '@/store/selectors'
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
import { createCustomGroupParentResolver } from './custom-group-lineage-parent'
import type { WorkspaceCardIdentity } from '../../../../shared/workspace-card-identity'
import { translate } from '@/i18n/i18n'

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
  // Why: a child card with no choice of its own shows the group it inherits and renders in.
  // Primitive result keeps the selector stable; skipped entirely when no groups exist.
  const groupId = useAppStore((s) => {
    if (data.groups.length === 0) {
      return null
    }
    const row = s.getKnownWorktreeById(worktree.id, worktree.hostId)
    return row
      ? getCustomWorkspaceGroupId(
          data,
          row,
          createCustomGroupParentResolver(s.worktreeLineageById, getAllWorktreesFromState(s))
        )
      : getCustomWorkspaceGroupId(data, worktree)
  })
  if (data.groups.length === 0) {
    return null
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>Custom group</Label>
      <Select
        value={groupId ?? UNGROUPED_CUSTOM_GROUP_ID}
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
            toast.error(
              error instanceof Error
                ? error.message
                : translate('custom.groups.changeFailed', 'Could not change group.')
            )
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
