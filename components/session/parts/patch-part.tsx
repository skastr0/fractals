'use client'

import { History } from 'lucide-react'
import { memo } from 'react'
import type { PatchPart } from '@/lib/opencode'

interface PatchPartRendererProps {
  part: PatchPart
}

/**
 * Patch parts are OpenCode's internal checkpoints for revert functionality.
 * They contain:
 * - hash: A git tree hash capturing the working directory state
 * - files: List of files that changed since this snapshot
 *
 * We render them as a minimal indicator since the actual content
 * (git hashes, file lists without diffs) isn't meaningful to users.
 */
export const PatchPartRenderer = memo(function PatchPartRenderer({ part }: PatchPartRendererProps) {
  const fileCount = part.files?.length ?? 0

  return (
    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
      <History className="h-3.5 w-3.5" />
      <span>
        Checkpoint recorded
        {fileCount > 0 && (
          <span className="ml-1 text-muted-foreground/70">
            ({fileCount} file{fileCount !== 1 ? 's' : ''} modified)
          </span>
        )}
      </span>
    </div>
  )
})
