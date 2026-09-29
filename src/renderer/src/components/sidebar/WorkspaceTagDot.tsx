import type { WorkspaceTag } from '../../../../shared/workspace-tags'

export function WorkspaceTagDot({ tag }: { tag: WorkspaceTag }) {
  return (
    <span
      role="img"
      aria-label={tag.name}
      className="size-2.5 shrink-0 rounded-full border border-foreground/30"
      style={{ backgroundColor: tag.color }}
    />
  )
}
