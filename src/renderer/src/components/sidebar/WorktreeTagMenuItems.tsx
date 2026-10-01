import { Tag } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useWorkspaceTagsStore } from '@/store/workspace-tags'
import { getWorkspaceTagIds, type TaggedWorkspace } from '../../../../shared/workspace-tags'
import { WorkspaceTagDot } from './WorkspaceTagDot'

/** Context-menu tag toggles; with several cards selected, a tag is checked only if all have it. */
export function WorktreeTagMenuItems({
  workspaces,
  disabled
}: {
  workspaces: readonly TaggedWorkspace[]
  disabled: boolean
}) {
  const state = useWorkspaceTagsStore((s) => s.data)
  const assignTagToMany = useWorkspaceTagsStore((s) => s.assignTagToMany)
  const selectedIdsByWorkspace = workspaces.map((workspace) => getWorkspaceTagIds(state, workspace))
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled || workspaces.length === 0}>
        <Tag className="size-3.5" />
        Tags
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48" data-worktree-tag-context-menu="">
        {state.definitions.length === 0 ? (
          <DropdownMenuItem disabled>
            No tags yet — add one from a card&apos;s details
          </DropdownMenuItem>
        ) : (
          state.definitions.map((tag) => {
            const count = selectedIdsByWorkspace.filter((ids) => ids.includes(tag.id)).length
            const checked = count > 0 && count === workspaces.length
            const partial = count > 0 && !checked
            return (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={checked}
                // Why: keep the menu open so several tags can be toggled in one visit.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => {
                  try {
                    assignTagToMany(workspaces, tag.id, !checked)
                  } catch (cause) {
                    toast.error(cause instanceof Error ? cause.message : 'Could not update tags.')
                  }
                }}
              >
                <WorkspaceTagDot tag={tag} />
                <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                {partial ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {count}/{workspaces.length}
                  </span>
                ) : null}
              </DropdownMenuCheckboxItem>
            )
          })
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
