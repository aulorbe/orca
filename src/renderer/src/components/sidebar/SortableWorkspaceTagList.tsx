import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkspaceTag } from '../../../../shared/workspace-tags'

// Why: a vertical list only reorders on Y; locking X keeps the row from sliding sideways.
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
const DRAG_MODIFIERS = [restrictToVerticalAxis]

export function SortableWorkspaceTagList({
  tags,
  onMove,
  onDraggingChange,
  renderRow
}: {
  tags: readonly WorkspaceTag[]
  onMove: (tagId: string, toIndex: number) => void
  onDraggingChange?: (dragging: boolean) => void
  renderRow: (tag: WorkspaceTag) => React.ReactNode
}) {
  // Why: a small distance keeps plain clicks on the grip from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const handleDragEnd = (event: DragEndEvent) => {
    onDraggingChange?.(false)
    const overId = event.over?.id
    if (overId === undefined || overId === event.active.id) {
      return
    }
    const toIndex = tags.findIndex((tag) => tag.id === overId)
    if (toIndex !== -1) {
      onMove(String(event.active.id), toIndex)
    }
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={DRAG_MODIFIERS}
      onDragStart={() => onDraggingChange?.(true)}
      onDragCancel={() => onDraggingChange?.(false)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tags.map((tag) => tag.id)} strategy={verticalListSortingStrategy}>
        {tags.map((tag) => (
          <SortableWorkspaceTagRow key={tag.id} tag={tag}>
            {renderRow(tag)}
          </SortableWorkspaceTagRow>
        ))}
      </SortableContext>
    </DndContext>
  )
}

function SortableWorkspaceTagRow({
  tag,
  children
}: {
  tag: WorkspaceTag
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tag.id })
  return (
    <div
      ref={setNodeRef}
      data-workspace-tag-row={tag.id}
      className={cn('relative flex items-center gap-1', isDragging && 'z-10 opacity-80')}
      style={{
        transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
        transition
      }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Reorder tag ${tag.name}`}
        className="flex h-5 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      {children}
    </div>
  )
}
