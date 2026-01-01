import { createClient, DEFAULT_SERVER_URL } from './client'
import { wrapSdkError } from './errors'

export interface ServerHealth {
  connected: boolean
  url: string
  version?: string
  error?: string
}

export interface HealthCheckOptions {
  baseUrl?: string
  directory?: string
  signal?: AbortSignal
  fetch?: typeof fetch
}

export async function checkServerHealth(options: HealthCheckOptions = {}): Promise<ServerHealth> {
  const baseUrl = options.baseUrl ?? DEFAULT_SERVER_URL
  const client = createClient({
    baseUrl,
    directory: options.directory,
    fetch: options.fetch,
  })

  try {
    const response = await client.global.health({
      throwOnError: true,
      signal: options.signal,
    })

    return {
      connected: true,
      url: baseUrl,
      version: response.data.version,
    }
  } catch (error) {
    const wrapped = wrapSdkError(error)
    return {
      connected: false,
      url: baseUrl,
      error: wrapped.message,
    }
  }
}
