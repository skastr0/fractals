'use client'

import { memo } from 'react'
import type { Part } from '@/lib/opencode'

import { AgentPartRenderer } from './parts/agent-part'
import { CompactionPartRenderer } from './parts/compaction-part'
import { FilePartRenderer } from './parts/file-part'
import { PatchPartRenderer } from './parts/patch-part'
import { ReasoningPartRenderer } from './parts/reasoning-part'
import { RetryPartRenderer } from './parts/retry-part'
import { SnapshotPartRenderer } from './parts/snapshot-part'
import { StepPartRenderer } from './parts/step-part'
import { SubtaskPartRenderer } from './parts/subtask-part'
import { TextPartRenderer } from './parts/text-part'
import { ToolPartRenderer } from './parts/tool-part'

interface PartRendererProps {
  part: Part
  /** Whether this part belongs to an assistant message (enables streaming cursor) */
  isAssistant?: boolean
}

export const PartRenderer = memo(function PartRenderer({ part, isAssistant }: PartRendererProps) {
  switch (part.type) {
    case 'text':
      return <TextPartRenderer part={part} isAssistant={isAssistant} />
    case 'reasoning':
      return <ReasoningPartRenderer part={part} />
    case 'tool':
      return <ToolPartRenderer part={part} />
    case 'file':
      return <FilePartRenderer part={part} />
    case 'patch':
      return <PatchPartRenderer part={part} />
    case 'agent':
      return <AgentPartRenderer part={part} />
    case 'step-start':
    case 'step-finish':
      return <StepPartRenderer part={part} />
    case 'subtask':
      return <SubtaskPartRenderer part={part} />
    case 'snapshot':
      return <SnapshotPartRenderer part={part} />
    case 'retry':
      return <RetryPartRenderer part={part} />
    case 'compaction':
      return <CompactionPartRenderer part={part} />
    default: {
      // Log unknown part types for debugging
      console.warn('Unknown part type:', (part as { type: string }).type, part)
      return null
    }
  }
})
