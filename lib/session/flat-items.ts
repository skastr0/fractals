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

export interface FlatItemsCacheEntry {
  signature: string
  items: FlatItem[]
}

export type FlatItemsCache = Map<string, FlatItemsCacheEntry>

export interface FlattenOptions {
  messages: Message[]
  getParts: (messageId: string) => Part[]
  cache?: FlatItemsCache
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

const buildPartSignature = (part: Part): string => {
  const base = `${part.id}:${part.type}`
  const endTime = getPartEndTime(part)
  const endToken = endTime === undefined ? '' : `:${endTime}`

  if (part.type === 'tool') {
    const toolPart = part as ToolPartExtended
    const status = toolPart.state?.status ?? ''
    const stateSignature = toolPart.state ? JSON.stringify(toolPart.state) : ''
    return `${base}:${status}:${stateSignature}${endToken}`
  }

  const textValue = (part as { text?: string }).text
  if (typeof textValue === 'string') {
    const textPart = part as TextPartExtended & { text: string }
    return `${base}:${textValue}:${textPart.ignored ? '1' : '0'}:${textPart.synthetic ? '1' : '0'}${endToken}`
  }

  if (part.type === 'file') {
    const filePart = part as { url?: string; filename?: string; mime?: string }
    return `${base}:${filePart.url ?? ''}:${filePart.filename ?? ''}:${filePart.mime ?? ''}${endToken}`
  }

  if (part.type === 'patch') {
    const patchPart = part as { files?: Array<{ path?: string }> }
    const fileCount = patchPart.files?.length ?? 0
    return `${base}:${fileCount}${endToken}`
  }

  return `${base}${endToken}`
}

const buildMessageSignature = (message: Message, parts: Part[]): string => {
  if (parts.length === 0) {
    return `${message.id}:${message.role}`
  }

  const partSignature = parts.map(buildPartSignature).join('|')
  return `${message.id}:${message.role}:${partSignature}`
}

export function flattenMessages(options: FlattenOptions): FlatItem[] {
  const { messages, getParts, cache } = options

  if (messages.length === 0) {
    cache?.clear()
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
  const seenTurnIds = cache ? new Set<string>() : undefined

  for (const userMessage of userMessages) {
    const turnId = userMessage.id
    if (seenTurnIds) {
      seenTurnIds.add(turnId)
    }

    const userParts = getParts(userMessage.id)
    const visibleUserParts = userParts.filter(isPartVisible)

    const assistantMessages = assistantByParent.get(userMessage.id) ?? []
    const assistantPartsByMessage = new Map<string, Part[]>()
    const assistantSignatures: string[] = []

    for (const assistantMessage of assistantMessages) {
      const assistantParts = getParts(assistantMessage.id)
      const visibleAssistantParts = assistantParts.filter(isPartVisible)
      assistantPartsByMessage.set(assistantMessage.id, visibleAssistantParts)

      if (cache) {
        assistantSignatures.push(buildMessageSignature(assistantMessage, visibleAssistantParts))
      }
    }

    const turnSignature = cache
      ? [buildMessageSignature(userMessage, visibleUserParts), ...assistantSignatures].join('|')
      : ''

    if (cache) {
      const cachedTurn = cache.get(turnId)
      if (cachedTurn && cachedTurn.signature === turnSignature) {
        for (let i = 0; i < cachedTurn.items.length; i += 1) {
          const cachedItem = cachedTurn.items[i]
          if (!cachedItem) {
            continue
          }
          cachedItem.index = flatItems.length
          cachedItem.isFirstInTurn = i === 0
          cachedItem.isLastInTurn = i === cachedTurn.items.length - 1
          flatItems.push(cachedItem)
        }
        continue
      }
    }

    const turnItems: TurnItem[] = []

    if (visibleUserParts.length > 0) {
      turnItems.push({
        id: `user-message-${userMessage.id}`,
        turnId,
        type: 'user-message',
        message: userMessage,
      })

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

    for (const assistantMessage of assistantMessages) {
      const visibleAssistantParts = assistantPartsByMessage.get(assistantMessage.id) ?? []

      if (visibleAssistantParts.length > 0) {
        turnItems.push({
          id: `assistant-header-${assistantMessage.id}`,
          turnId,
          type: 'assistant-header',
          message: assistantMessage,
        })

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

    if (turnItems.length === 0) {
      if (cache) {
        cache.delete(turnId)
      }
      continue
    }

    const nextItems: FlatItem[] = []
    for (let i = 0; i < turnItems.length; i += 1) {
      const item = turnItems[i]
      if (!item) {
        continue
      }
      const nextItem: FlatItem = {
        ...item,
        index: flatItems.length,
        isFirstInTurn: i === 0,
        isLastInTurn: i === turnItems.length - 1,
      }
      flatItems.push(nextItem)
      nextItems.push(nextItem)
    }

    if (cache) {
      cache.set(turnId, { signature: turnSignature, items: nextItems })
    }
  }

  if (cache && seenTurnIds) {
    for (const cachedTurnId of Array.from(cache.keys())) {
      if (!seenTurnIds.has(cachedTurnId)) {
        cache.delete(cachedTurnId)
      }
    }
  }

  return flatItems
}
