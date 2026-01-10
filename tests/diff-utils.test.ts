import { expect, test } from 'bun:test'

import { buildDiffFromFiles, classifyDiffLine } from '../lib/utils/diff'

test('classifyDiffLine detects diff line kinds', () => {
  expect(classifyDiffLine('diff --git a/file.ts b/file.ts')).toEqual('meta')
  expect(classifyDiffLine('--- a/file.ts')).toEqual('meta')
  expect(classifyDiffLine('+++ b/file.ts')).toEqual('meta')
  expect(classifyDiffLine('@@ -1,2 +1,3 @@')).toEqual('hunk')
  expect(classifyDiffLine('+added line')).toEqual('add')
  expect(classifyDiffLine('-removed line')).toEqual('remove')
  expect(classifyDiffLine(' context line')).toEqual('context')
  expect(classifyDiffLine('\\ No newline at end of file')).toEqual('meta')
})

test('buildDiffFromFiles creates a readable fallback diff', () => {
  const diff = buildDiffFromFiles(['src/app.ts', 'b/components/button.tsx'])

  expect(diff).toEqual(
    [
      'diff --git a/src/app.ts b/src/app.ts',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '',
      'diff --git a/components/button.tsx b/components/button.tsx',
      '--- a/components/button.tsx',
      '+++ b/components/button.tsx',
    ].join('\n'),
  )
})
