import { useCallback, useRef, useState } from 'react'

type WorktreeCardDetailMenu = 'issue' | 'review' | 'link-actions'

export function useWorktreeCardDetailsHoverControl() {
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenuState] = useState<WorktreeCardDetailMenu | null>(null)
  const openMenuRef = useRef<WorktreeCardDetailMenu | null>(null)
  const pendingHoverCloseRef = useRef(false)
  const holdOpenUntilRefocusRef = useRef(false)
  // Why: nested hover editors (tag dots) sit inside the trigger; the details card must yield to them.
  const suppressedRef = useRef(false)
  const openBlockedRef = useRef(false)

  const setOpenMenu = useCallback((menu: WorktreeCardDetailMenu | null) => {
    openMenuRef.current = menu
    setOpenMenuState(menu)
  }, [])

  const closeHover = useCallback(() => {
    pendingHoverCloseRef.current = false
    holdOpenUntilRefocusRef.current = false
    setOpenMenu(null)
    setOpen(false)
  }, [setOpenMenu])

  const handleHoverOpenChange = useCallback((next: boolean) => {
    if (next && (suppressedRef.current || openBlockedRef.current)) {
      return
    }
    // Why: portaled detail menus sit outside HoverCardContent — keep the card
    // mounted until the menu closes so the menu items stay clickable.
    if (openMenuRef.current) {
      pendingHoverCloseRef.current = !next
      return
    }
    // Why: the system browser opened from this card takes focus and the
    // pointer; keep the card for when the user comes back.
    if (!next && holdOpenUntilRefocusRef.current && !document.hasFocus()) {
      return
    }
    pendingHoverCloseRef.current = false
    if (!next) {
      holdOpenUntilRefocusRef.current = false
    }
    setOpen(next)
  }, [])

  const setDetailMenuOpen = useCallback(
    (menu: WorktreeCardDetailMenu, next: boolean) => {
      if (next) {
        setOpenMenu(menu)
        return
      }
      // Why: another menu may have opened in the same click that dismissed this one.
      if (openMenuRef.current !== menu) {
        return
      }
      setOpenMenu(null)
      if (pendingHoverCloseRef.current) {
        pendingHoverCloseRef.current = false
        // Why: the link-action popover anchors on the card, so leaving the card
        // for the popover is not a request to dismiss it.
        if (menu !== 'link-actions') {
          setOpen(false)
        }
      }
    },
    [setOpenMenu]
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

  const holdOpenUntilRefocus = useCallback(() => {
    if (holdOpenUntilRefocusRef.current) {
      return
    }
    holdOpenUntilRefocusRef.current = true
    window.addEventListener(
      'focus',
      () => {
        holdOpenUntilRefocusRef.current = false
      },
      { once: true }
    )
  }, [])

  return {
    hoverOpen: open || Boolean(openMenu),
    issueMenuOpen: openMenu === 'issue',
    reviewMenuOpen: openMenu === 'review',
    handleHoverOpenChange,
    handleIssueMenuOpenChange: (next: boolean) => setDetailMenuOpen('issue', next),
    handleReviewMenuOpenChange: (next: boolean) => setDetailMenuOpen('review', next),
    handleLinkActionsOpenChange: (next: boolean) => setDetailMenuOpen('link-actions', next),
    holdOpenUntilRefocus,
    closeHover,
    setHoverSuppressed,
    setHoverOpenBlocked
  }
}

export type WorktreeCardDetailsHoverControl = ReturnType<typeof useWorktreeCardDetailsHoverControl>
