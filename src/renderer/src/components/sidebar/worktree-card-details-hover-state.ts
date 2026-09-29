import { useCallback, useRef, useState } from 'react'

type WorktreeCardDetailMenu = 'issue' | 'review'

export function useWorktreeCardDetailsHoverControl() {
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<WorktreeCardDetailMenu | null>(null)
  const pendingHoverCloseRef = useRef(false)
  // Why: nested hover editors (tag dots) sit inside the trigger; the details card must yield to them.
  const suppressedRef = useRef(false)
  const openBlockedRef = useRef(false)

  const closeHover = useCallback(() => {
    pendingHoverCloseRef.current = false
    setOpenMenu(null)
    setOpen(false)
  }, [])

  const handleHoverOpenChange = useCallback(
    (next: boolean) => {
      if (next && (suppressedRef.current || openBlockedRef.current)) {
        return
      }
      // Why: portaled detail menus sit outside HoverCardContent — keep the card
      // mounted until the menu closes so the menu items stay clickable.
      if (openMenu) {
        pendingHoverCloseRef.current = !next
        return
      }
      pendingHoverCloseRef.current = false
      setOpen(next)
    },
    [openMenu]
  )

  const setHoverSuppressed = useCallback(
    (suppressed: boolean) => {
      suppressedRef.current = suppressed
      if (suppressed) {
        closeHover()
      }
    },
    [closeHover]
  )

  // Why: blocks opening without closing, so crossing the dots en route to an open card doesn't dismiss it.
  const setHoverOpenBlocked = useCallback((blocked: boolean) => {
    openBlockedRef.current = blocked
  }, [])

  const setDetailMenuOpen = useCallback((menu: WorktreeCardDetailMenu, next: boolean) => {
    setOpenMenu(next ? menu : null)
    if (!next && pendingHoverCloseRef.current) {
      pendingHoverCloseRef.current = false
      setOpen(false)
    }
  }, [])

  return {
    hoverOpen: open || Boolean(openMenu),
    issueMenuOpen: openMenu === 'issue',
    reviewMenuOpen: openMenu === 'review',
    handleHoverOpenChange,
    handleIssueMenuOpenChange: (next: boolean) => setDetailMenuOpen('issue', next),
    handleReviewMenuOpenChange: (next: boolean) => setDetailMenuOpen('review', next),
    closeHover,
    setHoverSuppressed,
    setHoverOpenBlocked
  }
}

export type WorktreeCardDetailsHoverControl = ReturnType<typeof useWorktreeCardDetailsHoverControl>
