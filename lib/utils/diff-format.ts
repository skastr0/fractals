import { createTwoFilesPatch } from 'diff'
import type { FileDiff } from '@/types'

const normalizeLineEndings = (value: string): string => {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

const buildFallbackPatch = (filePath: string): string => {
  return `--- ${filePath}\n+++ ${filePath}\n`
}

export const formatUnifiedDiff = (fileDiff: FileDiff): string => {
  const before = normalizeLineEndings(fileDiff.before ?? '')
  const after = normalizeLineEndings(fileDiff.after ?? '')

  try {
    return createTwoFilesPatch(fileDiff.file, fileDiff.file, before, after)
  } catch (_error) {
    return buildFallbackPatch(fileDiff.file)
  }
}

export const formatUnifiedDiffs = (fileDiffs: FileDiff[]): string[] => {
  return fileDiffs.map((fileDiff) => formatUnifiedDiff(fileDiff))
}

export const formatUnifiedDiffForClipboard = (fileDiff: FileDiff): string => {
  const patch = formatUnifiedDiff(fileDiff)

  if (!patch.trim()) {
    return fileDiff.file
  }

  return `${fileDiff.file}\n${patch}`
}
