import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { stopRepoHeaderKeyboardToggle } from './worktree-list/rows/header-event-guards'

export function CustomStatusGroupActions({ label }: { label: string }) {
  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={stopRepoHeaderKeyboardToggle}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Add custom subgroup under ${label}`}
            onClick={() => {
              const groups = useCustomWorkspaceGroups.getState()
              groups.setByStatus(true)
              groups.setEnabled(true)
              groups.setManagerOpen(true)
            }}
          >
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add custom subgroup</TooltipContent>
      </Tooltip>
    </div>
  )
}
