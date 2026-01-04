'use client'

import { memo } from 'react'
import type { Part } from '@/lib/opencode'

type SnapshotPart = Extract<Part, { type: 'snapshot' }>

interface SnapshotPartRendererProps {
  part: SnapshotPart
}

/**
 * Snapshot parts contain file state references but are not rendered
 * as visible elements in the CLI. They're used for internal tracking.
 */
export const SnapshotPartRenderer = memo(function SnapshotPartRenderer({
  part: _part,
}: SnapshotPartRendererProps) {
  // CLI doesn't render snapshot parts
  return null
})
