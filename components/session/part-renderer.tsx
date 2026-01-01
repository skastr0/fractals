'use client'

import { memo } from 'react'
import type { Part } from '@/lib/opencode'

import { AgentPartRenderer } from './parts/agent-part'
import { FilePartRenderer } from './parts/file-part'
import { PatchPartRenderer } from './parts/patch-part'
import { ReasoningPartRenderer } from './parts/reasoning-part'
import { StepPartRenderer } from './parts/step-part'
import { TextPartRenderer } from './parts/text-part'
import { ToolPartRenderer } from './parts/tool-part'

interface PartRendererProps {
  part: Part
}

export const PartRenderer = memo(function PartRenderer({ part }: PartRendererProps) {
  switch (part.type) {
    case 'text':
      return <TextPartRenderer part={part} />
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
    default:
      return null
  }
})
