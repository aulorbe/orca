import { cn } from '@/lib/utils'
import { RepoIconGlyph } from '@/components/repo/repo-icon'
import { RepoForkIndicator } from '@/components/repo/repo-fork-indicator'
import type { FolderWorkspacePathStatus } from '../../../../../../shared/folder-workspace-path-status'
import type { GroupHeaderRow } from '../../../../../../shared/sidebar-list/row-types'
import { CustomGroupTitle } from '../../CustomGroupTitle'
import { FolderPathStatusIndicator } from './FolderPathStatusIndicator'
import { RepoScanUnavailableIndicator } from './RepoScanUnavailableIndicator'
import { ProjectHeaderHostLabel } from './ProjectHeaderHostLabel'
import type { ProjectHeaderHostContext } from './project-header-host-context'
import type { getSidebarHeaderVisual } from './header-visuals'

type SidebarHeaderVisual = ReturnType<typeof getSidebarHeaderVisual>

// Why: statuses are the top tier, so they use the category-label treatment (11px caps, tinted)
// that card titles never use; custom subgroups sit quieter so they read as the status's children.
function getTitleClassName(row: GroupHeaderRow, isStatusHeader: boolean, tone: string): string {
  if (isStatusHeader) {
    return cn('text-[11px] font-bold uppercase tracking-[0.05em]', tone)
  }
  return row.customGroup ? 'text-[13px] font-medium' : 'text-[13px] font-semibold'
}

export function SectionHeaderTitle({
  row,
  label,
  headerVisual,
  hostContext,
  isStatusHeader,
  isRepoHeader,
  repoHeaderColor,
  projectGroupPathStatus,
  onToggle
}: {
  row: GroupHeaderRow
  label: string
  headerVisual: SidebarHeaderVisual
  hostContext: ProjectHeaderHostContext | undefined
  isStatusHeader: boolean
  isRepoHeader: boolean
  repoHeaderColor: string | undefined
  projectGroupPathStatus: FolderWorkspacePathStatus | null
  onToggle: () => void
}) {
  return (
    <>
      {/* Why: custom subgroups are nested under a status; their icon only added noise. */}
      {row.customGroup ? null : (
        <div
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-[4px]',
            repoHeaderColor ? 'text-muted-foreground' : headerVisual.tone
          )}
        >
          {row.repo ? (
            <RepoIconGlyph
              repoIcon={row.repo.repoIcon}
              color={repoHeaderColor}
              className="size-4"
              iconClassName="size-3.5"
            />
          ) : (
            <headerVisual.icon className="size-3" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className={cn(
              'min-w-0 truncate leading-4',
              getTitleClassName(row, isStatusHeader, headerVisual.tone)
            )}
          >
            {row.customGroup ? (
              <CustomGroupTitle groupKey={row.key} name={label} onToggle={onToggle} />
            ) : (
              label
            )}
          </div>
          {isStatusHeader && row.count > 0 ? (
            <span
              className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground"
              data-workspace-status-count=""
            >
              {row.count}
            </span>
          ) : null}
          {hostContext ? <ProjectHeaderHostLabel context={hostContext} /> : null}
          <RepoForkIndicator upstream={row.repo?.upstream} />
          <FolderPathStatusIndicator status={projectGroupPathStatus} />
          {isRepoHeader && row.repo ? <RepoScanUnavailableIndicator repo={row.repo} /> : null}
        </div>
      </div>
    </>
  )
}
