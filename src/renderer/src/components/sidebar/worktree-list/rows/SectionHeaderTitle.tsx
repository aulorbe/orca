import { cn } from '@/lib/utils'
import { RepoIconGlyph } from '@/components/repo/repo-icon'
import { RepoForkIndicator } from '@/components/repo/repo-fork-indicator'
import type { FolderWorkspacePathStatus } from '../../../../../../shared/folder-workspace-path-status'
import { CustomGroupTitle } from '../../CustomGroupTitle'
import type { GroupHeaderRow } from '../grouping/row-types'
import { FolderPathStatusIndicator } from './FolderPathStatusIndicator'
import { RepoScanUnavailableIndicator } from './RepoScanUnavailableIndicator'

// Why: statuses are the top tier, so they use the category-label treatment (11px caps, tinted)
// that card titles never use; custom subgroups sit quieter so they read as the status's children.
function getTitleClassName(row: GroupHeaderRow, isStatusHeader: boolean): string {
  if (isStatusHeader) {
    return cn('text-[11px] font-bold uppercase tracking-[0.05em]', row.tone)
  }
  return row.customGroup ? 'text-[13px] font-medium' : 'text-[13px] font-semibold'
}

export function SectionHeaderTitle({
  row,
  isStatusHeader,
  isRepoHeader,
  repoHeaderColor,
  projectGroupPathStatus,
  onToggle
}: {
  row: GroupHeaderRow
  isStatusHeader: boolean
  isRepoHeader: boolean
  repoHeaderColor: string | undefined
  projectGroupPathStatus: FolderWorkspacePathStatus | null
  onToggle: () => void
}) {
  // Why: custom subgroups are nested under a status; their icon only added noise.
  const showIcon = Boolean(row.icon) && !row.customGroup
  return (
    <>
      {showIcon && row.icon ? (
        <div
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-[4px]',
            repoHeaderColor ? 'text-muted-foreground' : row.tone
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
            <row.icon className="size-3" />
          )}
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className={cn('min-w-0 truncate leading-none', getTitleClassName(row, isStatusHeader))}
          >
            {row.customGroup ? (
              <CustomGroupTitle groupKey={row.key} name={row.label} onToggle={onToggle} />
            ) : (
              row.label
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
          <RepoForkIndicator upstream={row.repo?.upstream} />
          <FolderPathStatusIndicator status={projectGroupPathStatus} />
          {isRepoHeader && row.repo ? <RepoScanUnavailableIndicator repo={row.repo} /> : null}
        </div>
      </div>
    </>
  )
}
