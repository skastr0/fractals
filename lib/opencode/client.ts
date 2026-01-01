import {
  createOpencodeClient,
  type OpencodeClient,
  type OpencodeClientConfig,
} from '@opencode-ai/sdk/v2/client'

export type {
  AgentPart,
  AssistantMessage,
  Config,
  Event,
  Message,
  OpencodeClient,
  Part,
  PatchPart,
  Project,
  ReasoningPart,
  Session,
  SessionStatus,
  TextPart,
  ToolPart,
  UserMessage,
} from '@opencode-ai/sdk/v2/client'

export const DEFAULT_SERVER_URL = 'http://localhost:5577'

export type OpenCodeClientConfig = OpencodeClientConfig & {
  directory?: string
}

export function createClient(config: OpenCodeClientConfig = {}): OpencodeClient {
  const baseUrl = config.baseUrl ?? DEFAULT_SERVER_URL
  const throwOnError = config.throwOnError ?? true

  return createOpencodeClient({
    ...config,
    baseUrl,
    throwOnError,
  })
}

let defaultClient: OpencodeClient | null = null

export function getDefaultClient(): OpencodeClient {
  if (!defaultClient) {
    defaultClient = createClient()
  }

  return defaultClient
}

export function resetDefaultClient(): void {
  defaultClient = null
}
