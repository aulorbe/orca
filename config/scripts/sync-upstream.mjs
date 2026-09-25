import { execFileSync } from 'node:child_process'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../..')

function runGit(args, capture = false) {
  return (
    execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    }) ?? ''
  )
}

export function syncUpstream(git = runGit) {
  if (git(['branch', '--show-current'], true).trim() !== 'main') {
    throw new Error('Switch to main before syncing upstream. No branches were changed.')
  }
  if (git(['status', '--porcelain'], true).trim()) {
    throw new Error('Commit or stash your changes before syncing upstream.')
  }
  git(['fetch', 'upstream'])
  git(['merge', '--no-edit', 'upstream/main'])
  console.log('Upstream merged locally. Review and test, then run npm run push:fork when ready.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  if (process.argv.includes('--help')) {
    console.log(
      'Fetch and merge upstream/main into a clean main branch. Does not push, install dependencies, or restart apps.'
    )
  } else {
    try {
      syncUpstream()
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
