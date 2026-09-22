# Orca Custom (macOS)

This fork can be packaged as **Orca Custom.app**, alongside the official **Orca.app**.
The custom build uses `com.aulorbe.orca.custom` and a separate profile at
`~/Library/Application Support/Orca Custom`. Its settings, session records, runtime endpoint,
terminal daemon, and Keychain application identity are separate from the stock app.

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

Click a card's tag icon (or its colored dots) to add a tag name and color. Check an existing tag
to reuse it; uncheck it to remove it from that card. Hover the dots to see their names.

Use **Workspace options → Tags** to filter cards. Multiple selections match any selected tag;
**Clear tag filter** shows all cards again. Tags and the selected filter are saved locally in
Custom's renderer storage, not synced to GitHub or other Orca installations.

The original `pnpm build:mac` packaging path remains available and still produces **Orca.app**.
Use **`pnpm build:mac:custom`** for the side-by-side application.
