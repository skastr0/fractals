'use client'

import { memo } from 'react'

import type { ReasoningPart } from '@/lib/opencode'

import { ChainOfThought } from './chain-of-thought'

interface ReasoningPartRendererProps {
  part: ReasoningPart
}

export const ReasoningPartRenderer = memo(function ReasoningPartRenderer({
  part,
}: ReasoningPartRendererProps) {
  return <ChainOfThought part={part} />
})
