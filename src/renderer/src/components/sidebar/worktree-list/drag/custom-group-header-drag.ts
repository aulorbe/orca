import type React from 'react'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import { parseCustomGroupSectionKey } from '../../../../../../shared/custom-workspace-groups'
import { isHostHeaderActionTarget } from '../../host-header-drag-dom'
import { hasPointerBeenReleased } from '../../header-drag-pointer-release'
import { swallowNextClickOnDragHandle } from '../../header-drag-click-swallow'
import {
  createSidebarDragPreview,
  setSidebarPointerDragDocumentStyles,
  updateSidebarDragPreviewPosition
} from '../../worktree-sidebar-pointer-drag-dom'

const DRAG_THRESHOLD_PX = 4
const REORDER_ATTR = 'customGroupReorder'

type Drop = { anchorId: string; position: 'before' | 'after'; element: HTMLElement }

/** Visible headers of the dragged group's siblings (same parent section), in sidebar order. */
function siblingHeaders(
  container: HTMLElement,
  parentKey: string | null
): { id: string; element: HTMLElement }[] {
  const headers: { id: string; element: HTMLElement }[] = []
  for (const element of container.querySelectorAll<HTMLElement>('[data-custom-group-key]')) {
    const parsed = parseCustomGroupSectionKey(element.dataset.customGroupKey ?? '')
    if (parsed?.groupId && parsed.parentKey === parentKey) {
      headers.push({ id: parsed.groupId, element })
    }
  }
  return headers.sort(
    (a, b) => a.element.getBoundingClientRect().top - b.element.getBoundingClientRect().top
  )
}

function computeDrop(
  headers: { id: string; element: HTMLElement }[],
  groupId: string,
  pointerY: number
): Drop | null {
  const others = headers.filter((header) => header.id !== groupId)
  for (const header of others) {
    const rect = header.element.getBoundingClientRect()
    if (pointerY < (rect.top + rect.bottom) / 2) {
      return { anchorId: header.id, position: 'before', element: header.element }
    }
  }
  const last = others.at(-1)
  return last ? { anchorId: last.id, position: 'after', element: last.element } : null
}

function showDropIndicator(container: HTMLElement, drop: Drop | null): void {
  for (const element of container.querySelectorAll<HTMLElement>('[data-custom-group-reorder]')) {
    if (element !== drop?.element) {
      delete element.dataset[REORDER_ATTR]
    }
  }
  if (drop) {
    drop.element.dataset[REORDER_ATTR] = drop.position
  }
}

/**
 * Pointer-drag a custom group header to reorder groups. Listeners attach on pointerdown
 * (not via an effect) so a fast click's release can never be missed.
 */
export function beginCustomGroupHeaderDrag(
  event: React.PointerEvent<HTMLElement>,
  groupKey: string
): void {
  const parsed = parseCustomGroupSectionKey(groupKey)
  const handle = event.currentTarget
  const container = handle.closest<HTMLElement>('[role="listbox"]')
  if (
    event.button !== 0 ||
    !parsed?.groupId ||
    !container ||
    isHostHeaderActionTarget(event.target, handle) ||
    (event.target instanceof Element && event.target.closest('input, textarea'))
  ) {
    return
  }
  const groupId = parsed.groupId
  const { pointerId, clientX: startX, clientY: startY } = event
  let preview: { element: HTMLElement; offsetX: number; offsetY: number } | null = null
  let drop: Drop | null = null

  const finish = (commit: boolean): void => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('blur', onCancel)
    showDropIndicator(container, null)
    if (!preview) {
      return
    }
    preview.element.remove()
    setSidebarPointerDragDocumentStyles(false)
    // Why: the click that follows a drop would otherwise toggle the group's collapse state.
    swallowNextClickOnDragHandle(handle)
    if (commit && drop) {
      useCustomWorkspaceGroups.getState().placeGroup(groupId, drop.anchorId, drop.position)
    }
  }
  const onMove = (move: PointerEvent): void => {
    if (move.pointerId !== pointerId) {
      return
    }
    if (hasPointerBeenReleased(move)) {
      finish(false)
      return
    }
    if (!preview) {
      const dx = move.clientX - startX
      const dy = move.clientY - startY
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        return
      }
      const created = createSidebarDragPreview({
        sourceRow: handle,
        pointerX: move.clientX,
        pointerY: move.clientY,
        draggedCount: 1
      })
      preview = { element: created.preview, offsetX: created.offsetX, offsetY: created.offsetY }
      setSidebarPointerDragDocumentStyles(true)
    }
    updateSidebarDragPreviewPosition({
      preview: preview.element,
      pointerX: move.clientX,
      pointerY: move.clientY,
      offsetX: preview.offsetX,
      offsetY: preview.offsetY
    })
    drop = computeDrop(siblingHeaders(container, parsed.parentKey), groupId, move.clientY)
    showDropIndicator(container, drop)
  }
  const onUp = (up: PointerEvent): void => {
    if (up.pointerId === pointerId) {
      finish(true)
    }
  }
  const onCancel = (): void => finish(false)
  const onKeyDown = (key: KeyboardEvent): void => {
    if (key.key === 'Escape') {
      finish(false)
    }
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('blur', onCancel)
}
