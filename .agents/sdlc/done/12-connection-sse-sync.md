# SSE Subscription and Data Sync

## Context
OpenCode server pushes real-time updates via Server-Sent Events (SSE). We need to subscribe to these events and maintain a synchronized data cache that components can reactively read from. This is the replacement for Convex's real-time subscriptions.

## Acceptance Criteria
- [ ] SSE subscription established on project selection
- [ ] Event types properly typed and handled
- [ ] Reactive data store for sessions, messages, parts
- [ ] Session status updates working
- [ ] Message/part streaming updates
- [ ] Permission request events
- [ ] Automatic reconnection on disconnect
- [ ] Event handlers can be registered/unregistered

## Technical Guidance

### SyncProvider
```tsx
// context/SyncProvider.tsx
'use client';

import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { useObservable, use$ } from '@legendapp/state/react';
import { useOpenCode } from './OpenCodeProvider';
import { useProject } from './ProjectProvider';
import type { 
  Session, 
  Message, 
  Part, 
  Event, 
  SessionStatus,
  Permission,
} from '@/lib/opencode';

interface SyncData {
  sessions: Record<string, Session>;
  messages: Record<string, Message[]>;  // keyed by sessionID
  parts: Record<string, Part[]>;         // keyed by messageID
  session_status: Record<string, SessionStatus>;
  session_diff: Record<string, Array<{ file: string; additions: number; deletions: number }>>;
  permissions: Record<string, Permission[]>;
  todos: Record<string, Array<{ id: string; content: string; status: string; priority: string }>>;
}

interface SyncContextValue {
  data: SyncData;
  session: {
    get: (id: string) => Session | undefined;
    list: () => Session[];
    sync: (id: string) => Promise<void>;
  };
  isConnected: boolean;
  lastEvent: Event | null;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode();
  const { currentProject } = useProject();

  const state$ = useObservable<{
    data: SyncData;
    isConnected: boolean;
    lastEvent: Event | null;
  }>({
    data: {
      sessions: {},
      messages: {},
      parts: {},
      session_status: {},
      session_diff: {},
      permissions: {},
      todos: {},
    },
    isConnected: false,
    lastEvent: null,
  });

  // Handle different event types
  const handleEvent = useCallback((event: Event) => {
    state$.lastEvent.set(event);

    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        state$.data.sessions[event.properties.info.id].set(event.properties.info);
        break;

      case 'session.deleted':
        state$.data.sessions[event.properties.info.id].delete();
        break;

      case 'session.status':
        state$.data.session_status[event.properties.sessionID].set(event.properties.status);
        break;

      case 'session.diff':
        state$.data.session_diff[event.properties.sessionID].set(event.properties.diff);
        break;

      case 'message.updated':
        const msg = event.properties.info;
        const existing = state$.data.messages[msg.sessionID].peek() ?? [];
        const msgIndex = existing.findIndex(m => m.id === msg.id);
        if (msgIndex >= 0) {
          state$.data.messages[msg.sessionID][msgIndex].set(msg);
        } else {
          state$.data.messages[msg.sessionID].set([...existing, msg]);
        }
        break;

      case 'message.removed':
        const { sessionID, messageID } = event.properties;
        const msgs = state$.data.messages[sessionID].peek() ?? [];
        state$.data.messages[sessionID].set(msgs.filter(m => m.id !== messageID));
        break;

      case 'message.part.updated':
        const part = event.properties.part;
        const existingParts = state$.data.parts[part.messageID].peek() ?? [];
        const partIndex = existingParts.findIndex(p => p.id === part.id);
        if (partIndex >= 0) {
          state$.data.parts[part.messageID][partIndex].set(part);
        } else {
          state$.data.parts[part.messageID].set([...existingParts, part]);
        }
        break;

      case 'message.part.removed':
        const parts = state$.data.parts[event.properties.messageID].peek() ?? [];
        state$.data.parts[event.properties.messageID].set(
          parts.filter(p => p.id !== event.properties.partID)
        );
        break;

      case 'permission.updated':
        const perm = event.properties;
        const perms = state$.data.permissions[perm.sessionID].peek() ?? [];
        state$.data.permissions[perm.sessionID].set([...perms, perm]);
        break;

      case 'todo.updated':
        state$.data.todos[event.properties.sessionID].set(event.properties.todos);
        break;
    }
  }, [state$]);

  // SSE subscription
  useEffect(() => {
    if (!client || !currentProject) return;

    let abortController = new AbortController();

    const connect = async () => {
      try {
        const response = await client.event.subscribe({
          signal: abortController.signal,
        });

        state$.isConnected.set(true);

        // Handle SSE stream
        const reader = response.data;
        if (reader && typeof reader[Symbol.asyncIterator] === 'function') {
          for await (const event of reader) {
            handleEvent(event);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('SSE error:', error);
          state$.isConnected.set(false);
          
          // Reconnect after delay
          setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      abortController.abort();
      state$.isConnected.set(false);
    };
  }, [client, currentProject, handleEvent, state$]);

  // Initial data fetch
  useEffect(() => {
    if (!client || !currentProject) return;

    const loadSessions = async () => {
      const result = await client.session.list();
      const sessionsMap: Record<string, Session> = {};
      for (const session of result.data) {
        sessionsMap[session.id] = session;
      }
      state$.data.sessions.set(sessionsMap);
    };

    loadSessions();
  }, [client, currentProject, state$]);

  const syncSession = useCallback(async (sessionId: string) => {
    if (!client) return;

    // Fetch messages for session
    const messagesResult = await client.session.messages({ sessionID: sessionId });
    state$.data.messages[sessionId].set(messagesResult.data);

    // Parts are streamed via SSE, but we could fetch initial state here
  }, [client, state$]);

  const value: SyncContextValue = {
    data: use$(state$.data),
    session: {
      get: (id) => state$.data.sessions[id].peek(),
      list: () => Object.values(state$.data.sessions.peek()),
      sync: syncSession,
    },
    isConnected: use$(state$.isConnected),
    lastEvent: use$(state$.lastEvent),
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
}
```

### Event Emitter Hook
```tsx
// hooks/useEventSubscription.ts
import { useEffect } from 'react';
import { useSync } from '@/context/SyncProvider';
import type { Event } from '@/lib/opencode';

export function useEventSubscription<T extends Event['type']>(
  eventType: T,
  handler: (event: Extract<Event, { type: T }>) => void,
) {
  const { lastEvent } = useSync();

  useEffect(() => {
    if (lastEvent?.type === eventType) {
      handler(lastEvent as Extract<Event, { type: T }>);
    }
  }, [lastEvent, eventType, handler]);
}
```

## Dependencies
- 03-foundation-opencode-sdk
- 04-foundation-core-providers
- 11-connection-project-selection

## Estimated Effort
1.5 days

## Notes
- Reference OpenCode's sdk.tsx for SSE patterns
- Legend State enables fine-grained reactivity
- Consider using React Query for initial data fetch with SSE for updates
