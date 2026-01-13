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

// =============================================================================
// Session Error Classification
// These types and helpers classify OpenCode SDK session errors for UI display
// =============================================================================

/**
 * Session error from OpenCode SDK (from session.error SSE event)
 * Matches the error field on AssistantMessage and EventSessionError
 */
export interface SessionError {
  name: string
  data: Record<string, unknown>
}

/**
 * Known session error types from OpenCode SDK
 */
export type SessionErrorName =
  | 'ProviderAuthError'
  | 'UnknownError'
  | 'MessageOutputLengthError'
  | 'MessageAbortedError'
  | 'APIError'

/**
 * Classification of session errors for UI treatment
 */
export type SessionErrorClassification =
  | 'hidden' // Don't show (MessageAbortedError, retryable APIError)
  | 'critical' // Cannot dismiss (ProviderAuthError)
  | 'dismissable' // User can dismiss (UnknownError, MessageOutputLengthError, non-retryable APIError)

/**
 * Result of classifying a session error
 */
export interface ClassifiedSessionError {
  error: SessionError
  classification: SessionErrorClassification
  message: string
  hint?: string
}

/**
 * Check if an APIError is retryable
 */
function isRetryableApiError(error: SessionError): boolean {
  if (error.name !== 'APIError') {
    return false
  }
  const data = error.data as { isRetryable?: boolean }
  return data.isRetryable === true
}

/**
 * Extract the user-facing message from a session error
 */
function getSessionErrorMessage(error: SessionError): string {
  const data = error.data as { message?: string; providerID?: string }

  if (data.message) {
    return data.message
  }

  switch (error.name) {
    case 'ProviderAuthError':
      return data.providerID
        ? `Authentication failed for ${data.providerID}`
        : 'Authentication failed'
    case 'MessageOutputLengthError':
      return 'Response was too long and was truncated'
    case 'MessageAbortedError':
      return 'Message was cancelled'
    case 'APIError':
      return 'An API error occurred'
    default:
      return 'An error occurred'
  }
}

/**
 * Get a hint for recovering from the error
 */
function getSessionErrorHint(error: SessionError): string | undefined {
  switch (error.name) {
    case 'ProviderAuthError':
      return 'Check your API key or re-authenticate with the provider'
    case 'MessageOutputLengthError':
      return 'Try breaking your request into smaller parts'
    case 'APIError': {
      const data = error.data as { isRetryable?: boolean }
      if (data.isRetryable) {
        return 'The request will be retried automatically'
      }
      return 'You may need to try again later'
    }
    default:
      return undefined
  }
}

/**
 * Classify a session error for UI treatment
 *
 * - MessageAbortedError: hidden (just an interruption)
 * - Retryable APIError: hidden (auto-retry handles it via session.status=retry)
 * - ProviderAuthError: critical (cannot dismiss, needs user action)
 * - Others: dismissable (user can hide the banner)
 */
export function classifySessionError(
  error: SessionError | null | undefined,
): ClassifiedSessionError | null {
  if (!error) {
    return null
  }

  // MessageAbortedError is just an interruption, not an error to display
  if (error.name === 'MessageAbortedError') {
    return null
  }

  // Retryable API errors are handled by automatic retry (session.status=retry)
  if (isRetryableApiError(error)) {
    return null
  }

  const message = getSessionErrorMessage(error)
  const hint = getSessionErrorHint(error)

  // ProviderAuthError requires user action - cannot be dismissed
  if (error.name === 'ProviderAuthError') {
    return {
      error,
      classification: 'critical',
      message,
      hint,
    }
  }

  // All other errors can be dismissed
  return {
    error,
    classification: 'dismissable',
    message,
    hint,
  }
}

/**
 * Check if a session error should be shown in the UI
 */
export function shouldShowSessionError(error: SessionError | null | undefined): boolean {
  return classifySessionError(error) !== null
}

/**
 * Check if a session error can be dismissed by the user
 */
export function canDismissSessionError(error: SessionError | null | undefined): boolean {
  const classified = classifySessionError(error)
  return classified !== null && classified.classification === 'dismissable'
}

/**
 * Generate a stable signature for an error (for tracking dismissals)
 */
export function getSessionErrorSignature(error: SessionError | null | undefined): string | null {
  if (!error) {
    return null
  }
  // Use error name + stringified data for a stable signature
  try {
    return `${error.name}:${JSON.stringify(error.data)}`
  } catch {
    return error.name
  }
}
