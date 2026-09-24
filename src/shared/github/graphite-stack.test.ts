import { expect, it } from 'vitest'
import { parseGraphiteStackComment } from './graphite-stack'

import { stackComment } from './graphite-stack-test-fixtures'

it('reads the observed Graphite comment format, preserving top-to-base order', () => {
  expect(
    parseGraphiteStackComment(stackComment(), { owner: 'ACME', repo: 'widgets' }, 102)
  ).toEqual([103, 102, 101])
})
it('does not infer stacks from unrelated PR references or Graphite attachments', () => {
  expect(
    parseGraphiteStackComment('Depends on #101 and #102', { owner: 'acme', repo: 'widgets' }, 102)
  ).toBeNull()
  expect(
    parseGraphiteStackComment(
      '![demo](https://app.graphite.com/user-attachments/file.png)',
      { owner: 'acme', repo: 'widgets' },
      102
    )
  ).toBeNull()
  expect(
    parseGraphiteStackComment(stackComment([102]), { owner: 'acme', repo: 'widgets' }, 102)
  ).toBeNull()
})
it('rejects unrelated repositories, missing current PRs, duplicate entries, and spoofed URLs', () => {
  const repository = { owner: 'acme', repo: 'widgets' }
  expect(parseGraphiteStackComment(stackComment(), repository, 999)).toBeNull()
  expect(parseGraphiteStackComment(stackComment([102, 102]), repository, 102)).toBeNull()
  expect(parseGraphiteStackComment(stackComment([103, 102], 'other'), repository, 102)).toBeNull()
  expect(
    parseGraphiteStackComment(
      stackComment().replaceAll('app.graphite.com', 'app.graphite.com.evil.test'),
      repository,
      102
    )
  ).toBeNull()
})
