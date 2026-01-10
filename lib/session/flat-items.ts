import type { AssistantMessage, Message, Part, UserMessage } from '@/lib/opencode'

export type FlatItemType = 'user-message' | 'assistant-header' | 'part'

export interface FlatItemBase {
  id: string
  turnId: string
  type: FlatItemType
  index: number
  isFirstInTurn: boolean
  isLastInTurn: boolean
}

export interface UserMessageItem extends FlatItemBase {
  type: 'user-message'
  message: UserMessage
}

export interface AssistantHeaderItem extends FlatItemBase {
  type: 'assistant-header'
  message: AssistantMessage
}

export interface PartItem extends FlatItemBase {
  type: 'part'
  part: Part
  isAssistant: boolean
  isStreaming: boolean
  /** Whether this part is synthetic (system-injected), should be collapsed by default */
  isSynthetic: boolean
}

export type FlatItem = UserMessageItem | AssistantHeaderItem | PartItem

export interface FlattenOptions {
  messages: Message[]
  getParts: (messageId: string) => Part[]
}

type TurnItem =
  | Omit<UserMessageItem, 'index' | 'isFirstInTurn' | 'isLastInTurn'>
  | Omit<AssistantHeaderItem, 'index' | 'isFirstInTurn' | 'isLastInTurn'>
  | Omit<PartItem, 'index' | 'isFirstInTurn' | 'isLastInTurn'>

const isUserMessage = (message: Message): message is UserMessage => message.role === 'user'
const isAssistantMessage = (message: Message): message is AssistantMessage =>
  message.role === 'assistant'

type PartWithTime = Part & { time?: { end?: number } }
type TextPartExtended = Part & { synthetic?: boolean; ignored?: boolean }
type ToolPartExtended = Part & { state?: { status?: string } }

const getPartEndTime = (part: Part): number | undefined => {
  return (part as PartWithTime).time?.end
}

// Check if a part is still streaming (not finished)
const isPartStreaming = (part: Part): boolean => {
  // Tool parts: check state.status instead of time.end
  if (part.type === 'tool') {
    const toolPart = part as ToolPartExtended
    const status = toolPart.state?.status
    // Streaming if pending or running
    return status === 'pending' || status === 'running'
  }

  // All other parts: check time.end
  return getPartEndTime(part) === undefined
}

const isPartSynthetic = (part: Part): boolean => {
  if (part.type === 'text') {
    return (part as TextPartExtended).synthetic === true
  }
  return false
}

// Hidden part types that don't render any preview
const HIDDEN_PART_TYPES = new Set(['step-start', 'step-finish', 'snapshot'])

// Check if a part should be visible in the message list
// Filters out parts that would render as empty (no preview content)
const isPartVisible = (part: Part): boolean => {
  // Hidden parts never render
  if (HIDDEN_PART_TYPES.has(part.type)) {
    return false
  }

  // Text parts: filter out empty or ignored
  if (part.type === 'text') {
    // Cast to access optional ignored property
    const textPart = part as { text: string; ignored?: boolean }
    if (textPart.ignored || !textPart.text.trim()) {
      return false
    }
  }

  // All other part types are potentially visible
  return true
}

export function flattenMessages(options: FlattenOptions): FlatItem[] {
  const { messages, getParts } = options

  if (messages.length === 0) {
    return []
  }

  const userMessages: UserMessage[] = []
  const assistantByParent = new Map<string, AssistantMessage[]>()

  // Messages are expected to be pre-ordered chronologically.
  for (const message of messages) {
    if (isUserMessage(message)) {
      userMessages.push(message)
      continue
    }

    if (isAssistantMessage(message) && message.parentID) {
      const existing = assistantByParent.get(message.parentID)
      if (existing) {
        existing.push(message)
      } else {
        assistantByParent.set(message.parentID, [message])
      }
    }
  }

  const flatItems: FlatItem[] = []

  for (const userMessage of userMessages) {
    const turnId = userMessage.id
    const turnItems: TurnItem[] = []

    // Collect user parts first
    const userParts = getParts(userMessage.id)
    const visibleUserParts = userParts.filter(isPartVisible)

    // Only add UserMessageItem if there are visible parts
    if (visibleUserParts.length > 0) {
      turnItems.push({
        id: `user-message-${userMessage.id}`,
        turnId,
        type: 'user-message',
        message: userMessage,
      })

      // Add user parts
      for (const part of visibleUserParts) {
        turnItems.push({
          id: `part-${userMessage.id}-${part.id}`,
          turnId,
          type: 'part',
          part,
          isAssistant: false,
          isStreaming: isPartStreaming(part),
          isSynthetic: isPartSynthetic(part),
        })
      }
    }

    // Collect and add assistant parts
    const assistantMessages = assistantByParent.get(userMessage.id) ?? []
    for (const assistantMessage of assistantMessages) {
      const assistantParts = getParts(assistantMessage.id)
      const visibleAssistantParts = assistantParts.filter(isPartVisible)

      // Only add AssistantHeaderItem if there are visible parts
      if (visibleAssistantParts.length > 0) {
        turnItems.push({
          id: `assistant-header-${assistantMessage.id}`,
          turnId,
          type: 'assistant-header',
          message: assistantMessage,
        })

        // Add assistant parts
        for (const part of visibleAssistantParts) {
          turnItems.push({
            id: `part-${assistantMessage.id}-${part.id}`,
            turnId,
            type: 'part',
            part,
            isAssistant: true,
            isStreaming: isPartStreaming(part),
            isSynthetic: isPartSynthetic(part),
          })
        }
      }
    }

    // Skip turns with no visible items
    if (turnItems.length === 0) {
      continue
    }

    for (let i = 0; i < turnItems.length; i += 1) {
      const item = turnItems[i]
      if (!item) {
        continue
      }
      flatItems.push({
        ...item,
        index: flatItems.length,
        isFirstInTurn: i === 0,
        isLastInTurn: i === turnItems.length - 1,
      })
    }
  }

  return flatItems
}
