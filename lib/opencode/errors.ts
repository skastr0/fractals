export type OpenCodeErrorCode =
  | 'CONNECTION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'UNKNOWN'

export class OpenCodeError extends Error {
  readonly code: OpenCodeErrorCode
  readonly cause?: unknown

  constructor(message: string, code: OpenCodeErrorCode, cause?: unknown) {
    super(message)
    this.name = 'OpenCodeError'
    this.code = code
    this.cause = cause
  }
}

export class ConnectionError extends OpenCodeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONNECTION_ERROR', cause)
    this.name = 'ConnectionError'
  }
}

export class NotFoundError extends OpenCodeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NOT_FOUND', cause)
    this.name = 'NotFoundError'
  }
}

export class SessionNotFoundError extends OpenCodeError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'NOT_FOUND')
    this.name = 'SessionNotFoundError'
  }
}

const connectionCodes = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Unknown error'
}

const getErrorName = (error: unknown): string | undefined => {
  if (!isRecord(error)) {
    return undefined
  }

  const name = error.name
  return typeof name === 'string' ? name : undefined
}

const getErrorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) {
    return undefined
  }

  const status = error.status
  if (typeof status === 'number') {
    return status
  }

  const response = error.response
  if (isRecord(response) && typeof response.status === 'number') {
    return response.status
  }

  return undefined
}

const getErrorCode = (error: unknown): string | undefined => {
  if (!isRecord(error)) {
    return undefined
  }

  const code = error.code
  return typeof code === 'string' ? code : undefined
}

const isConnectionError = (error: unknown, message: string): boolean => {
  if (error instanceof TypeError) {
    return true
  }

  const code = getErrorCode(error)
  if (code && connectionCodes.has(code)) {
    return true
  }

  const normalized = message.toLowerCase()
  return normalized.includes('fetch') || normalized.includes('network')
}

export function wrapSdkError(error: unknown): OpenCodeError {
  if (error instanceof OpenCodeError) {
    return error
  }

  const message = getErrorMessage(error)

  if (isConnectionError(error, message)) {
    return new ConnectionError(message, error)
  }

  const status = getErrorStatus(error)
  if (status === 404) {
    return new NotFoundError(message, error)
  }

  if (status === 401) {
    return new OpenCodeError(message, 'UNAUTHORIZED', error)
  }

  if (status === 403) {
    return new OpenCodeError(message, 'FORBIDDEN', error)
  }

  if (status === 400) {
    return new OpenCodeError(message, 'BAD_REQUEST', error)
  }

  const name = getErrorName(error)
  if (name === 'NotFoundError') {
    return new NotFoundError(message, error)
  }

  return new OpenCodeError(message, 'UNKNOWN', error)
}
