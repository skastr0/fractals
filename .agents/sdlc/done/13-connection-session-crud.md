# Session CRUD Operations

## Context
Implement all session lifecycle operations: create, read, continue (default), abort, fork, and delete. The key design decision is "continue by default" - clicking a session always continues it rather than forking.

## Acceptance Criteria
- [x] Create new session
- [x] List sessions (with filtering by parent/depth)
- [x] Get session details
- [x] Continue session (send message to existing session)
- [x] Fork session from specific message
- [x] Abort running session
- [x] Delete/archive session
- [x] Session title generation/editing
- [x] Subagent session discovery (via parentID)

## Technical Guidance

### Session Service
```tsx
// lib/opencode/sessions.ts
import { getDefaultClient, type Session, type Message, type Part } from './client';
import { wrapSdkError } from './errors';

export interface CreateSessionOptions {
  title?: string;
}

export interface SendMessageOptions {
  sessionId: string;
  content: string;
  files?: Array<{ mime: string; url: string; filename?: string }>;
  agent?: string;
  model?: { providerID: string; modelID: string };
}

export interface ForkSessionOptions {
  sessionId: string;
  messageId: string;
}

export const sessionService = {
  async list(): Promise<Session[]> {
    const client = getDefaultClient();
    const result = await client.session.list();
    return result.data;
  },

  async get(sessionId: string): Promise<Session> {
    const client = getDefaultClient();
    const result = await client.session.get({ sessionID: sessionId });
    return result.data;
  },

  async create(options?: CreateSessionOptions): Promise<Session> {
    const client = getDefaultClient();
    const result = await client.session.create();
    return result.data;
  },

  async getMessages(sessionId: string): Promise<Message[]> {
    const client = getDefaultClient();
    const result = await client.session.messages({ sessionID: sessionId });
    return result.data;
  },

  async getChildren(sessionId: string): Promise<Session[]> {
    const client = getDefaultClient();
    const result = await client.session.children({ sessionID: sessionId });
    return result.data;
  },

  async sendMessage(options: SendMessageOptions): Promise<void> {
    const client = getDefaultClient();
    
    const parts: Array<any> = [
      { type: 'text' as const, text: options.content },
    ];

    // Add file attachments if any
    if (options.files) {
      for (const file of options.files) {
        parts.push({
          type: 'file' as const,
          mime: file.mime,
          url: file.url,
          filename: file.filename,
        });
      }
    }

    await client.session.prompt({
      sessionID: options.sessionId,
      parts,
      ...(options.agent && { agent: options.agent }),
      ...(options.model && { model: options.model }),
    });
  },

  async fork(options: ForkSessionOptions): Promise<Session> {
    const client = getDefaultClient();
    const result = await client.session.fork({
      sessionID: options.sessionId,
      messageID: options.messageId,
    });
    return result.data;
  },

  async abort(sessionId: string): Promise<void> {
    const client = getDefaultClient();
    await client.session.abort({ sessionID: sessionId });
  },

  async delete(sessionId: string): Promise<void> {
    const client = getDefaultClient();
    await client.session.delete({ sessionID: sessionId });
  },

  async updateTitle(sessionId: string, title: string): Promise<void> {
    const client = getDefaultClient();
    await client.session.update({ sessionID: sessionId, title });
  },

  async revert(sessionId: string, messageId: string): Promise<void> {
    const client = getDefaultClient();
    await client.session.revert({ sessionID: sessionId, messageID: messageId });
  },

  async unrevert(sessionId: string): Promise<void> {
    const client = getDefaultClient();
    await client.session.unrevert({ sessionID: sessionId });
  },
};
```

### useSession Hook
```tsx
// hooks/useSession.ts
import { useCallback, useMemo } from 'react';
import { useSync } from '@/context/SyncProvider';
import { sessionService, type SendMessageOptions } from '@/lib/opencode/sessions';
import type { Session, Message, Part, SessionStatus } from '@/lib/opencode';

export function useSession(sessionId: string | undefined) {
  const sync = useSync();

  const session = useMemo(() => {
    if (!sessionId) return undefined;
    return sync.data.sessions[sessionId];
  }, [sync.data.sessions, sessionId]);

  const messages = useMemo(() => {
    if (!sessionId) return [];
    return sync.data.messages[sessionId] ?? [];
  }, [sync.data.messages, sessionId]);

  const status = useMemo((): SessionStatus => {
    if (!sessionId) return { type: 'idle' };
    return sync.data.session_status[sessionId] ?? { type: 'idle' };
  }, [sync.data.session_status, sessionId]);

  const diffs = useMemo(() => {
    if (!sessionId) return [];
    return sync.data.session_diff[sessionId] ?? [];
  }, [sync.data.session_diff, sessionId]);

  const getParts = useCallback((messageId: string): Part[] => {
    return sync.data.parts[messageId] ?? [];
  }, [sync.data.parts]);

  const sendMessage = useCallback(async (content: string, options?: Partial<SendMessageOptions>) => {
    if (!sessionId) throw new Error('No session selected');
    await sessionService.sendMessage({
      sessionId,
      content,
      ...options,
    });
  }, [sessionId]);

  const abort = useCallback(async () => {
    if (!sessionId) return;
    await sessionService.abort(sessionId);
  }, [sessionId]);

  const fork = useCallback(async (messageId: string) => {
    if (!sessionId) throw new Error('No session selected');
    return sessionService.fork({ sessionId, messageId });
  }, [sessionId]);

  return {
    session,
    messages,
    status,
    diffs,
    getParts,
    sendMessage,
    abort,
    fork,
    isLoading: !session && !!sessionId,
    isWorking: status.type !== 'idle',
  };
}
```

### useSessions Hook
```tsx
// hooks/useSessions.ts
import { useMemo, useCallback } from 'react';
import { useSync } from '@/context/SyncProvider';
import { sessionService } from '@/lib/opencode/sessions';
import type { Session } from '@/lib/opencode';

export interface UseSessionsOptions {
  parentId?: string;
  depth?: number;
  includeArchived?: boolean;
}

export function useSessions(options?: UseSessionsOptions) {
  const sync = useSync();

  const sessions = useMemo(() => {
    let all = Object.values(sync.data.sessions);

    // Filter by parent
    if (options?.parentId !== undefined) {
      all = all.filter(s => s.parentID === options.parentId);
    }

    // Filter by depth
    if (options?.depth !== undefined) {
      all = all.filter(s => (s.depth ?? 0) === options.depth);
    }

    // Filter archived
    if (!options?.includeArchived) {
      all = all.filter(s => !s.time.archived);
    }

    // Sort by updated time, newest first
    return all.sort((a, b) => b.time.updated - a.time.updated);
  }, [sync.data.sessions, options]);

  // Root sessions (depth 0 or undefined, no parent)
  const rootSessions = useMemo(() => {
    return Object.values(sync.data.sessions)
      .filter(s => !s.parentID && !s.time.archived)
      .sort((a, b) => b.time.updated - a.time.updated);
  }, [sync.data.sessions]);

  const create = useCallback(async () => {
    return sessionService.create();
  }, []);

  const getSubagentSessions = useCallback((parentId: string) => {
    return Object.values(sync.data.sessions)
      .filter(s => s.parentID === parentId)
      .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
  }, [sync.data.sessions]);

  return {
    sessions,
    rootSessions,
    create,
    getSubagentSessions,
  };
}
```

## Dependencies
- 03-foundation-opencode-sdk
- 12-connection-sse-sync

## Estimated Effort
1 day

## Notes
- "Continue by default" means no auto-fork - important UX decision
- Subagents have parentID and depth > 0
- Session.revert allows undo/redo
- 2025-12-31: Implemented session service and hooks.
- 2025-12-31: Updated server connection hook dependencies to satisfy lint.
- 2025-12-31: bun run check fails due to missing @/components/project-selector.

## Blockers
- 2025-12-31: TypeScript check fails because `components/layout/header.tsx` imports missing `@/components/project-selector`.
