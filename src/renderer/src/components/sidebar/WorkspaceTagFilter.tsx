import { useWorkspaceTagsStore } from '@/store/workspace-tags'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { WorkspaceTagDot } from './WorktreeTags'

export function WorkspaceTagFilter({
  preserveWorkspaceBoardOpen = false
}: {
  preserveWorkspaceBoardOpen?: boolean
}) {
  const tags = useWorkspaceTagsStore((s) => s.data)
  const selectFilter = useWorkspaceTagsStore((s) => s.selectFilter)
  const clearFilter = useWorkspaceTagsStore((s) => s.clearFilter)
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        Tags{tags.filterIds.length > 0 ? ` (${tags.filterIds.length})` : ''}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className="w-56"
        data-workspace-board-preserve-open={preserveWorkspaceBoardOpen ? '' : undefined}
      >
        <div className="scrollbar-sleek max-h-80 overflow-y-auto">
          <DropdownMenuLabel>Match any selected tag</DropdownMenuLabel>
          {tags.definitions.length === 0 && (
            <DropdownMenuItem disabled>Add tags using a card’s tag icon</DropdownMenuItem>
          )}
          {tags.definitions.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              aria-label={tag.name}
              checked={tags.filterIds.includes(tag.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => selectFilter(tag.id, checked === true)}
            >
              <WorkspaceTagDot tag={tag} />
              <span className="min-w-0 truncate">{tag.name}</span>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={tags.filterIds.length === 0} onSelect={clearFilter}>
            Clear tag filter
          </DropdownMenuItem>
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
