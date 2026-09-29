import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { handleRepoHeaderCollapseAffordancePointerDown } from './header-event-guards'

export function HeaderCollapseChevron({
  collapsed,
  onToggle
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
      data-repo-header-collapse-affordance=""
      aria-hidden
      onPointerDown={handleRepoHeaderCollapseAffordancePointerDown}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      <ChevronDown className={cn('size-3.5 transition-transform', collapsed && '-rotate-90')} />
    </div>
  )
}
