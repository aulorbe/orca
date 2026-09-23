// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarGroupByToggle } from './SidebarGroupByToggle'
import { useCustomWorkspaceGroups } from '@/store/custom-workspace-groups'
import {
  EMPTY_CUSTOM_WORKSPACE_GROUPS,
  getCustomParentGroupBy
} from '../../../../shared/custom-workspace-groups'
import type { WorktreeGroupBy } from './worktree-list/grouping/row-types'

const roots: Root[] = []

async function renderGroupByToggle(args: {
  groupBy: WorktreeGroupBy
  setGroupBy: (groupBy: WorktreeGroupBy) => void
}): Promise<HTMLDivElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.push(root)

  await act(async () => {
    root.render(<SidebarGroupByToggle groupBy={args.groupBy} setGroupBy={args.setGroupBy} />)
  })

  return container
}

describe('SidebarGroupByToggle', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    useCustomWorkspaceGroups.setState({ data: EMPTY_CUSTOM_WORKSPACE_GROUPS })
  })

  afterEach(() => {
    roots.splice(0).forEach((root) => {
      act(() => root.unmount())
    })
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('keeps custom subgroups enabled when switching native grouping modes', async () => {
    useCustomWorkspaceGroups.setState({
      data: { ...EMPTY_CUSTOM_WORKSPACE_GROUPS, enabled: true, byStatus: true }
    })
    const container = await renderGroupByToggle({
      groupBy: 'workspace-status',
      setGroupBy: vi.fn()
    })
    for (const [label, value] of [
      ['Project', 'repo'],
      ['PR', 'pr-status'],
      ['None', 'none']
    ]) {
      await act(async () => {
        ;[...container.querySelectorAll('button')]
          .find((button) => button.textContent === label)
          ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      })
      expect(useCustomWorkspaceGroups.getState().data.enabled).toBe(true)
      expect(getCustomParentGroupBy(useCustomWorkspaceGroups.getState().data)).toBe(value)
    }
  })

  it('commits the pointer-selected grouping mode', async () => {
    const setGroupBy = vi.fn()
    const container = await renderGroupByToggle({ groupBy: 'repo', setGroupBy })
    const noneButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'None'
    )

    await act(async () => {
      noneButton?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })

    expect(noneButton).not.toBeUndefined()
    expect(setGroupBy).toHaveBeenCalledWith('none')
  })
})
