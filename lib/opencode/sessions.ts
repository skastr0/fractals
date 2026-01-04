import { getDefaultClient, type Message, type Session } from './client'
import { wrapSdkError } from './errors'

export interface CreateSessionOptions {
  title?: string
}

export interface SessionFileAttachment {
  mime: string
  url: string
  filename?: string
}

export interface SendMessageOptions {
  sessionId: string
  content: string
  directory: string
  files?: SessionFileAttachment[]
  agent?: string
  model?: { providerID: string; modelID: string }
  variant?: string
}

export interface ForkSessionOptions {
  sessionId: string
  messageId: string
}

type PromptPart =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'file'
      mime: string
      url: string
      filename?: string
    }

const withSdkError = async <T>(action: () => Promise<T>): Promise<T> => {
  try {
    return await action()
  } catch (error) {
    throw wrapSdkError(error)
  }
}

export const sessionService = {
  async list(): Promise<Session[]> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.session.list(undefined, { throwOnError: true })
      return result.data
    })
  },

  async get(sessionId: string): Promise<Session> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.session.get({ sessionID: sessionId }, { throwOnError: true })
      return result.data
    })
  },

  async create(options?: CreateSessionOptions): Promise<Session> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.session.create(
        options?.title ? { title: options.title } : undefined,
        { throwOnError: true },
      )
      return result.data
    })
  },

  async getMessages(sessionId: string): Promise<Message[]> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.session.messages({ sessionID: sessionId }, { throwOnError: true })
      return result.data.map((entry) => entry.info)
    })
  },

  async getChildren(sessionId: string): Promise<Session[]> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.session.children({ sessionID: sessionId }, { throwOnError: true })
      return result.data
    })
  },

  async sendMessage(options: SendMessageOptions): Promise<void> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const parts: PromptPart[] = [{ type: 'text', text: options.content }]

      if (options.files) {
        for (const file of options.files) {
          parts.push({
            type: 'file',
            mime: file.mime,
            url: file.url,
            filename: file.filename,
          })
        }
      }

      await client.session.prompt(
        {
          sessionID: options.sessionId,
          parts,
          directory: options.directory,
          ...(options.agent ? { agent: options.agent } : {}),
          ...(options.model ? { model: options.model } : {}),
          ...(options.variant ? { variant: options.variant } : {}),
        },
        { throwOnError: true },
      )
    })
  },

  async fork(options: ForkSessionOptions): Promise<Session> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      const result = await client.session.fork(
        {
          sessionID: options.sessionId,
          messageID: options.messageId,
        },
        { throwOnError: true },
      )
      return result.data
    })
  },

  async abort(sessionId: string): Promise<void> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      await client.session.abort({ sessionID: sessionId }, { throwOnError: true })
    })
  },

  async delete(sessionId: string): Promise<void> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      await client.session.delete({ sessionID: sessionId }, { throwOnError: true })
    })
  },

  async updateTitle(sessionId: string, title: string): Promise<void> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      await client.session.update({ sessionID: sessionId, title }, { throwOnError: true })
    })
  },

  async revert(sessionId: string, messageId: string): Promise<void> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      await client.session.revert(
        {
          sessionID: sessionId,
          messageID: messageId,
        },
        { throwOnError: true },
      )
    })
  },

  async unrevert(sessionId: string): Promise<void> {
    return withSdkError(async () => {
      const client = getDefaultClient()
      await client.session.unrevert({ sessionID: sessionId }, { throwOnError: true })
    })
  },
}
