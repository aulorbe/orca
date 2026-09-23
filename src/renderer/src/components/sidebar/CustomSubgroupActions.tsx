import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { stopRepoHeaderKeyboardToggle } from './worktree-list/rows/header-event-guards'

import type { WorktreeGroupBy } from './worktree-list/grouping/row-types'

export function CustomSubgroupActions({
  label,
  groupBy
}: {
  label: string
  groupBy: WorktreeGroupBy
}) {
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
              groups.setParentGroupBy(groupBy)
              groups.setEnabled(true)
              groups.setManagerOpen(true)
            }}
          >
            <FolderPlus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add custom subgroup</TooltipContent>
      </Tooltip>
    </div>
  )
}
