import {
  createOpencodeClient,
  type OpencodeClient,
  type OpencodeClientConfig,
  type Project as SDKProject,
} from '@opencode-ai/sdk/v2/client'

export type {
  Agent,
  AgentPart,
  AssistantMessage,
  Command,
  Config,
  Event,
  GlobalEvent,
  Message,
  OpencodeClient,
  Part,
  PatchPart,
  ReasoningPart,
  Session,
  SessionStatus,
  TextPart,
  ToolPart,
  UserMessage,
} from '@opencode-ai/sdk/v2/client'

/**
 * Extended Project type that includes sandboxes (worktrees) returned by OpenCode server.
 * The SDK type doesn't include this field, but the server returns it.
 */
export type Project = SDKProject & {
  /** Array of worktree/sandbox directory paths associated with this project */
  sandboxes?: string[]
  /** The .git directory path (may differ from worktree for worktrees) */
  vcsDir?: string
}

export const DEFAULT_SERVER_URL = 'http://localhost:4096'

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
