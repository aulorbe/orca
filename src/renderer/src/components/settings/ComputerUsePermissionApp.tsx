import { FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ComputerUsePermissionApp({ appPath }: { appPath: string | null }) {
  if (!appPath) {
    return null
  }
  const name =
    appPath
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/\.app$/, '') ?? 'Computer Use helper'
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium">App to allow: {name}</p>
      <p className="text-xs text-muted-foreground">
        Grant Accessibility and Screen Recording to this helper, not the main Orca window. If it is
        missing from the macOS list, use + and select this app.
      </p>
      <p className="break-all font-mono text-xs text-muted-foreground">{appPath}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            const result = await window.api.shell.openInFileManager(appPath)
            if (!result.ok) {
              throw new Error('Open Finder and use Go → Go to Folder with the app path above.')
            }
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : 'Could not reveal the permission app.'
            )
          }
        }}
      >
        <FolderOpen />
        Show permission app in Finder
      </Button>
    </div>
  )
}
