'use client'

import { memo } from 'react'
import { PierreDiffView } from '@/components/ui/pierre-diff-view'
import type { PatchPart } from '@/lib/opencode'
import { buildDiffFromFiles } from '@/lib/utils/diff'

interface PatchPartRendererProps {
  part: PatchPart
}

type PatchFileEntry = {
  path?: unknown
  file?: unknown
  filename?: unknown
  patch?: unknown
  diff?: unknown
  content?: unknown
}

type PatchPartPayload = PatchPart & {
  patch?: unknown
  diff?: unknown
  content?: unknown
  files?: Array<string | PatchFileEntry>
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() ? value : null
}

function getPatchFiles(part: PatchPart): string[] {
  const payload = part as PatchPartPayload
  const files = payload.files
  if (!Array.isArray(files)) return []

  const fileNames: string[] = []

  for (const entry of files) {
    if (typeof entry === 'string') {
      fileNames.push(entry)
      continue
    }

    if (entry && typeof entry === 'object') {
      const typedEntry = entry as PatchFileEntry
      const name =
        toNonEmptyString(typedEntry.path) ??
        toNonEmptyString(typedEntry.file) ??
        toNonEmptyString(typedEntry.filename)

      if (name) {
        fileNames.push(name)
      }
    }
  }

  return Array.from(new Set(fileNames))
}

function getPatchText(part: PatchPart): string | null {
  const payload = part as PatchPartPayload
  const directText =
    toNonEmptyString(payload.patch) ??
    toNonEmptyString(payload.diff) ??
    toNonEmptyString(payload.content)

  if (directText) return directText

  const files = payload.files
  if (!Array.isArray(files)) return null

  const patches: string[] = []

  for (const entry of files) {
    if (!entry || typeof entry !== 'object') continue

    const typedEntry = entry as PatchFileEntry
    const patch =
      toNonEmptyString(typedEntry.patch) ??
      toNonEmptyString(typedEntry.diff) ??
      toNonEmptyString(typedEntry.content)

    if (patch) {
      patches.push(patch)
    }
  }

  return patches.length > 0 ? patches.join('\n') : null
}

export const PatchPartRenderer = memo(function PatchPartRenderer({ part }: PatchPartRendererProps) {
  const fileList = getPatchFiles(part)
  const patchText = getPatchText(part)
  const diffText = patchText ?? (fileList.length ? buildDiffFromFiles(fileList) : '')

  return (
    <div className="space-y-3">
      {fileList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fileList.map((file) => (
            <span
              key={file}
              className="rounded bg-secondary px-2 py-1 text-xs font-mono text-secondary-foreground"
            >
              {file}
            </span>
          ))}
        </div>
      )}
      <PierreDiffView diff={diffText} />
    </div>
  )
})
