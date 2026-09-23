# Orca Custom (macOS)

This fork can be packaged as **Orca Custom.app**, alongside the official **Orca.app**.
The custom build uses `com.aulorbe.orca.custom` and a separate profile at
`~/Library/Application Support/Orca Custom`. Its settings, session records, runtime endpoint,
terminal daemon, and Keychain application identity are separate from the stock app.

## Continuous development (recommended for UI changes)

With dependencies installed, run:

```sh
cd ~/Desktop/orca
npm run dev:custom
```

Keep that terminal open. **Orca Custom Dev** loads renderer/UI edits automatically—no installer
needed. Main-process and CLI changes require stopping and restarting this command. Do not add
`--watch`: the default keeps backend restarts under your control.

Dev uses `~/Library/Application Support/Orca Custom Dev`, separate from both installed apps.
Add your projects once in this dev profile; existing installed-app tasks and settings are not
moved over automatically. Keep critical tasks in the installed app while developing. Ctrl+C
stops the dev app and can stop its dev terminals. Its terminals get a scoped CLI automatically;
you do not need to install a global CLI for this workflow.

## Build and install

Use Node 24 and a current Corepack that supports the repository's pinned pnpm 12.

```sh
cd ~/Desktop/orca
pnpm install --frozen-lockfile
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:mac:custom
```

The custom command packages only your Mac's CPU architecture, without publishing a release or
requiring Apple Developer signing credentials. On Apple Silicon, open:

```sh
open dist/orca-custom-macos-arm64.dmg
```

Drag **Orca Custom.app** into Applications. Do **not** replace or quit **Orca.app**: it can keep
running its existing tasks. Intel Macs use `dist/orca-custom-macos-x64.dmg` instead.

If macOS blocks your own locally built app, use System Settings → Privacy & Security → Open Anyway.
The custom app may request its own permissions; stock Orca's grants do not necessarily transfer.

## Keeping the two apps separate

- Orca Custom starts with an empty workspace list. It does not copy or take over active stock sessions.
- Use separate worktrees or clones for concurrent agents. Two apps editing the same checkout still
  share those files; separate app profiles do not isolate a Git working directory.
- Registering its CLI installs **`orca-custom`**, leaving the global **`orca`** command alone.
  Inside custom-managed terminals, the private `orca` launcher intentionally targets the custom app.
- It does not register the stock `orca://` URL scheme.
- It skips automatic rewriting of shared agent-hook scripts at startup. Installed hook scripts and
  external agent accounts remain user-global; a separate profile is not a sandbox for external tools.
- Stock release updates are disabled for Orca Custom, including manual channel switching. Pull your
  fork's latest changes, rebuild, and replace only **Orca Custom.app** to update it.

## Card tags

Hover a card and click **Add tags** / **Edit tags** in its details. Each card can have multiple tags,
each with a different hex color. Check existing tags to reuse them; uncheck them to remove them
from just that card. The title shows only colored dots for tags already applied—no empty tag icon.

Use the **×** beside a tag in the editor to delete it from all cards. A confirmation dialog
appears before deletion. Different tags cannot use the same hex color.

Use **Workspace options → Tags** to filter cards. Multiple selections match any selected tag;
**Clear tag filter** shows all cards again. Tags and the selected filter are saved locally in
Custom's renderer storage, not synced to GitHub or other Orca installations.

## Custom grouping

Choose **Workspace options → Group by → Custom**, then **Manage custom groups…**. There is one
saved set of groups: add names, rename them, reorder with the arrows, or delete a group.

Choose any built-in grouping—**None, Status, PR, or Project**—then enable **Custom subgroups**.
The option stays enabled when switching groupings. You can also use **Add custom subgroup** on
a section heading. The same group names and assignments are shared across views; None keeps
just the custom groups without an outer tier. Recent/Smart/Manual sorting continues to apply
inside each group.

Moving between subgroups only changes the custom group. Under Status, moving to another status
changes it too; dropping on a status heading puts the card in that status’s Ungrouped section.
Project and PR sections are automatic, so cards cannot be dragged into another project or PR
state. Both levels collapse independently. Renaming or deleting a shared group applies everywhere.

Status now shows every configured status, including empty drop targets. Workspace Status is
manually assigned and defaults to In progress—it is not the same as GitHub PR state. Use PR
grouping for review-derived sections.

Drag cards between custom group headers (including **Ungrouped**), or choose **Custom group** in
a card's hover details. Each card belongs to one group. Double-click a custom group title to rename
it, or right-click its title and choose **Edit**; Ungrouped is fixed.

When deleting a group, choose where its cards go: Ungrouped, another group, or workspace deletion.
Moving is the default. Workspace deletion uses Orca's existing review/confirmation flow, and the
group is kept on cancellation or partial failure. Primary, folder, and unavailable workspaces
must be handled individually rather than bulk-deleted here. Pinned cards retain the existing
Pinned section behavior.

Groups are saved locally and do not change statuses or tags. Switching back to another grouping
option keeps your custom groups for later. This organizes the sidebar; the status board keeps its
existing columns.

## PR links

GitHub PR links opened from the app go to Graphite. GitHub API records and copied canonical URLs
stay unchanged; issues, enterprise GitHub hosts, and non-GitHub review links keep their destinations.

The original `pnpm build:mac` packaging path remains available and still produces **Orca.app**.
Use **`pnpm build:mac:custom`** for the side-by-side application.
