export type DiffLineKind = 'add' | 'remove' | 'context' | 'meta' | 'hunk'

const META_PREFIXES = ['diff --git', 'index ', '+++', '---']

function normalizeFilePath(filePath: string): string {
  const trimmed = filePath.trim()
  if (!trimmed) return ''

  return trimmed.replace(/^([ab])\//, '').replace(/^\.\//, '')
}

export function classifyDiffLine(line: string): DiffLineKind {
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('\\')) return 'meta'
  if (META_PREFIXES.some((prefix) => line.startsWith(prefix))) return 'meta'
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add'
  if (line.startsWith('-') && !line.startsWith('---')) return 'remove'
  return 'context'
}

export function buildDiffFromFiles(files: string[]): string {
  const normalizedFiles = files.map(normalizeFilePath).filter(Boolean)
  if (normalizedFiles.length === 0) return ''

  return normalizedFiles
    .map(
      (filePath) => `diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}`,
    )
    .join('\n\n')
}
