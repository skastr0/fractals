# OpenCode SDK Integration

## Context
Integrate the OpenCode JavaScript SDK (`@opencode-ai/sdk`) for communicating with a local OpenCode server. The SDK provides typed API clients for sessions, messages, projects, configuration, and SSE event subscriptions.

This work item enables all OpenCode server communication throughout the application.

## Acceptance Criteria
- [x] `@opencode-ai/sdk` package installed from npm
- [x] SDK client wrapper created with proper TypeScript types
- [x] Server URL configuration (default localhost:5577)
- [x] Connection health check implemented
- [x] SDK types exported for use across the app
- [x] Error types wrapped with application-specific errors
- [x] Basic test verifying SDK connectivity

## Technical Guidance

### SDK Installation
```bash
bun add @opencode-ai/sdk
```

### Client Wrapper
```tsx
// lib/opencode/client.ts
import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk/v2/client';

export type { 
  Session, 
  Message, 
  Part, 
  Project, 
  Config,
  Event,
  SessionStatus,
  ToolPart,
  TextPart,
  ReasoningPart,
  PatchPart,
} from '@opencode-ai/sdk/v2/client';

export interface OpenCodeClientConfig {
  baseUrl?: string;
  directory?: string;
  signal?: AbortSignal;
}

const DEFAULT_URL = 'http://localhost:5577';

export function createClient(config?: OpenCodeClientConfig) {
  const baseUrl = config?.baseUrl ?? DEFAULT_URL;
  
  return createOpencodeClient({
    baseUrl,
    signal: config?.signal ?? AbortSignal.timeout(1000 * 60 * 10),
    directory: config?.directory,
    throwOnError: true,
  });
}

// Singleton for default client
let defaultClient: OpencodeClient | null = null;

export function getDefaultClient(): OpencodeClient {
  if (!defaultClient) {
    defaultClient = createClient();
  }
  return defaultClient;
}

export function resetDefaultClient(): void {
  defaultClient = null;
}
```

### Connection Health Check
```tsx
// lib/opencode/health.ts
import { getDefaultClient } from './client';

export interface ServerHealth {
  connected: boolean;
  url: string;
  error?: string;
}

export async function checkServerHealth(url?: string): Promise<ServerHealth> {
  try {
    const client = url ? createClient({ baseUrl: url }) : getDefaultClient();
    await client.global.health();
    return { connected: true, url: url ?? DEFAULT_URL };
  } catch (error) {
    return { 
      connected: false, 
      url: url ?? DEFAULT_URL,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Error Wrapping
```tsx
// lib/opencode/errors.ts
export class OpenCodeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OpenCodeError';
  }
}

export class ConnectionError extends OpenCodeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
  }
}

export class SessionNotFoundError extends OpenCodeError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND');
    this.name = 'SessionNotFoundError';
  }
}

export function wrapSdkError(error: unknown): OpenCodeError {
  if (error instanceof OpenCodeError) return error;
  
  // Handle SDK-specific errors
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const e = error as { name: string; data?: { message?: string } };
    if (e.name === 'NotFoundError') {
      return new OpenCodeError(e.data?.message ?? 'Not found', 'NOT_FOUND', error);
    }
  }
  
  return new OpenCodeError(
    error instanceof Error ? error.message : 'Unknown error',
    'UNKNOWN',
    error,
  );
}
```

### Key SDK Methods to Use
From the SDK analysis, the main APIs we need:

**Session Management:**
- `client.session.list()` - List all sessions
- `client.session.get({ sessionID })` - Get session details
- `client.session.create()` - Create new session
- `client.session.children({ sessionID })` - Get subagent sessions
- `client.session.fork({ sessionID, messageID })` - Fork from message
- `client.session.abort({ sessionID })` - Stop session

**Messages:**
- `client.session.messages({ sessionID })` - Get all messages
- `client.session.prompt({ sessionID, parts })` - Send message

**Projects:**
- `client.project.list()` - List projects
- `client.project.current()` - Get current project

**Configuration:**
- `client.config.get()` - Get opencode.json config
- `client.app.agents()` - Get available agents

**Events (SSE):**
- `client.event.subscribe()` - Subscribe to events

## Dependencies
- 01-foundation-project-setup

## Estimated Effort
1 day

## Notes
- The SDK is auto-generated from OpenAPI spec, types are comprehensive
- SSE subscription details handled in separate work item
- Consider adding retry logic for transient failures
- 2025-12-31: Implemented SDK wrapper, health check, errors, exports, and a mocked health test. Files: lib/opencode/client.ts, lib/opencode/health.ts, lib/opencode/errors.ts, lib/opencode/index.ts, tests/opencode-health.test.ts, types/bun-test.d.ts
