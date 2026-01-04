'use client'

import { memo } from 'react'
import type { Part } from '@/lib/opencode'

type StepPart = Extract<Part, { type: 'step-start' | 'step-finish' }>

interface StepPartRendererProps {
  part: StepPart
}

/**
 * Step parts (step-start, step-finish) contain metadata about LLM steps
 * but are not rendered as visible elements in the CLI.
 * The token counts are shown at the message level instead.
 *
 * We return null to match CLI behavior. If you need to debug step info,
 * you can inspect the parts in the browser devtools.
 */
export const StepPartRenderer = memo(function StepPartRenderer({
  part: _part,
}: StepPartRendererProps) {
  // CLI doesn't render step parts - token info is shown at message level
  return null
})
