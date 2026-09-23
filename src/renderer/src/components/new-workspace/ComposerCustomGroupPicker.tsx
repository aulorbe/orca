import { useId } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { UNGROUPED_CUSTOM_GROUP_ID } from '../../../../shared/custom-workspace-groups'

export function ComposerCustomGroupPicker({
  value,
  onChange,
  disabled
}: {
  value: string | null
  onChange: (groupId: string | null) => void
  disabled: boolean
}) {
  const groups = useCustomWorkspaceGroups((state) => state.data.groups)
  const id = useId()
  if (groups.length === 0) {
    return null
  }
  const selected = groups.some((group) => group.id === value) ? value : null
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Custom group
      </label>
      <Select
        value={selected ?? UNGROUPED_CUSTOM_GROUP_ID}
        disabled={disabled}
        onValueChange={(next) => onChange(next === UNGROUPED_CUSTOM_GROUP_ID ? null : next)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNGROUPED_CUSTOM_GROUP_ID}>Ungrouped</SelectItem>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
