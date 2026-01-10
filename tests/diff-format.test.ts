import { expect, test } from 'bun:test'

import {
  formatUnifiedDiff,
  formatUnifiedDiffForClipboard,
  formatUnifiedDiffs,
} from '../lib/utils/diff-format'
import type { FileDiff } from '../types'

const buildDiff = (overrides: Partial<FileDiff> = {}): FileDiff => ({
  file: 'src/example.ts',
  before: 'const alpha = 1;\r\n',
  after: 'const alpha = 1;\r\nconst beta = 2;\r\n',
  additions: 1,
  deletions: 0,
  ...overrides,
})

test('formatUnifiedDiffs returns unified diff strings', () => {
  const patches = formatUnifiedDiffs([buildDiff()])
  const patch = patches[0] ?? ''

  expect(patch.includes('--- src/example.ts')).toEqual(true)
  expect(patch.includes('+++ src/example.ts')).toEqual(true)
  expect(patch.includes('+const beta = 2;')).toEqual(true)
  expect(patch.includes('\r')).toEqual(false)
})

test('formatUnifiedDiffForClipboard prepends the file path', () => {
  const output = formatUnifiedDiffForClipboard(buildDiff())

  expect(output.startsWith('src/example.ts\n')).toEqual(true)
  expect(output.includes('+++ src/example.ts')).toEqual(true)
})

test('formatUnifiedDiff handles empty content safely', () => {
  const emptyDiff = buildDiff({
    file: 'src/empty.ts',
    before: '',
    after: '',
  })

  const patch = formatUnifiedDiff(emptyDiff)

  expect(patch.includes('--- src/empty.ts')).toEqual(true)
  expect(patch.includes('+++ src/empty.ts')).toEqual(true)
})
