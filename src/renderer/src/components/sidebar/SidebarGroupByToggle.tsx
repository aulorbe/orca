import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { WorktreeGroupBy } from '../../../../shared/sidebar-list/row-types'
import { GROUP_BY_OPTIONS } from './sidebar-workspace-option-items'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { getCustomParentGroupBy } from '../../../../shared/custom-workspace-groups'

const OPTIONS = [...GROUP_BY_OPTIONS, { id: 'custom' as const, label: 'Custom' }]

type SidebarGroupByToggleProps = {
  groupBy: WorktreeGroupBy
  setGroupBy: (groupBy: WorktreeGroupBy) => void
}

export function SidebarGroupByToggle({ groupBy, setGroupBy }: SidebarGroupByToggleProps) {
  const data = useCustomWorkspaceGroups((s) => s.data)
  const parent = getCustomParentGroupBy(data)
  const choose = (value: WorktreeGroupBy | 'custom') => {
    const groups = useCustomWorkspaceGroups.getState()
    const keepSubgroups = groups.data.enabled && getCustomParentGroupBy(groups.data) !== null
    if (value !== 'custom') {
      setGroupBy(value)
    }
    groups.setParentGroupBy(value === 'custom' ? null : value)
    groups.setEnabled(value === 'custom' || keepSubgroups)
  }
  return (
    <ToggleGroup
      type="single"
      value={data.enabled ? (parent ?? 'custom') : groupBy}
      onValueChange={(value) => {
        const option = OPTIONS.find((entry) => entry.id === value)
        if (option) {
          choose(option.id)
        }
      }}
      variant="outline"
      size="sm"
      className="h-6 w-full justify-stretch"
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.id}
          value={option.id}
          // Capture pointer intent before Radix roving focus can consume the click without changing ToggleGroup value.
          onPointerDownCapture={() => choose(option.id)}
          className="h-6 grow basis-0 px-1 text-[10px] data-[state=on]:bg-foreground/10 data-[state=on]:font-semibold data-[state=on]:text-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
