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

const getPartEndTime = (part: Part): number | undefined => {
  return (part as PartWithTime).time?.end
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
    const turnItems: TurnItem[] = [
      {
        id: `user-message-${userMessage.id}`,
        turnId,
        type: 'user-message',
        message: userMessage,
      },
    ]

    const userParts = getParts(userMessage.id)
    for (const part of userParts) {
      turnItems.push({
        id: `part-${userMessage.id}-${part.id}`,
        turnId,
        type: 'part',
        part,
        isAssistant: false,
        isStreaming: !getPartEndTime(part),
      })
    }

    const assistantMessages = assistantByParent.get(userMessage.id) ?? []
    for (const assistantMessage of assistantMessages) {
      turnItems.push({
        id: `assistant-header-${assistantMessage.id}`,
        turnId,
        type: 'assistant-header',
        message: assistantMessage,
      })

      const assistantParts = getParts(assistantMessage.id)
      for (const part of assistantParts) {
        turnItems.push({
          id: `part-${assistantMessage.id}-${part.id}`,
          turnId,
          type: 'part',
          part,
          isAssistant: true,
          isStreaming: !getPartEndTime(part),
        })
      }
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
