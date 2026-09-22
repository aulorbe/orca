import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { WorktreeGroupBy } from './worktree-list/grouping/row-types'
import { GROUP_BY_OPTIONS } from './sidebar-workspace-option-items'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'

const OPTIONS = [...GROUP_BY_OPTIONS, { id: 'custom' as const, label: 'Custom' }]

type SidebarGroupByToggleProps = {
  groupBy: WorktreeGroupBy
  setGroupBy: (groupBy: WorktreeGroupBy) => void
}

export function SidebarGroupByToggle({ groupBy, setGroupBy }: SidebarGroupByToggleProps) {
  const customEnabled = useCustomWorkspaceGroups((s) => s.data.enabled)
  const setCustomEnabled = useCustomWorkspaceGroups((s) => s.setEnabled)
  const choose = (value: WorktreeGroupBy | 'custom') => {
    setCustomEnabled(value === 'custom')
    if (value !== 'custom') {
      setGroupBy(value)
    }
  }
  return (
    <ToggleGroup
      type="single"
      value={customEnabled ? 'custom' : groupBy}
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
          // Why: inside the dropdown menu, Radix can focus a toggle item without
          // committing ToggleGroup's value change; capture the pointer intent
          // before the menu's roving-focus handling turns it into a no-op.
          onPointerDownCapture={() => choose(option.id)}
          className="h-6 grow basis-0 px-1 text-[10px] data-[state=on]:bg-foreground/10 data-[state=on]:font-semibold data-[state=on]:text-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
