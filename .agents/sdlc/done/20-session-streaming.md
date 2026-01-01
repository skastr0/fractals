# Streaming Updates

## Context
When the assistant is generating a response, text arrives in real-time via SSE as delta updates. We need to handle these deltas to show a typewriter effect and update tool states as they progress.

## Acceptance Criteria
- [x] Text streaming with typewriter effect
- [x] Delta accumulation for partial text
- [x] Tool state transitions (pending → running → completed)
- [x] Reasoning content streaming
- [x] Visual indicator for streaming state
- [x] Proper handling of multiple concurrent parts
- [x] Smooth scroll during streaming

## Technical Guidance

### Streaming Text Display
```tsx
// components/session/streaming-text.tsx
import { memo, useEffect, useRef } from 'react';
import { useSync } from '@/context/SyncProvider';
import { Markdown } from '@/components/ui/markdown';

interface StreamingTextProps {
  partId: string;
  sessionId: string;
  messageId: string;
}

export const StreamingText = memo(function StreamingText({
  partId,
  sessionId,
  messageId,
}: StreamingTextProps) {
  const sync = useSync();
  const cursorRef = useRef<HTMLSpanElement>(null);

  // Get the current part from sync state
  const parts = sync.data.parts[messageId] ?? [];
  const part = parts.find(p => p.id === partId);

  // Check if still streaming (no end time)
  const isStreaming = part?.type === 'text' && !part.time?.end;

  // Cursor animation
  useEffect(() => {
    if (!isStreaming || !cursorRef.current) return;
    
    const cursor = cursorRef.current;
    cursor.style.animation = 'blink 1s step-start infinite';
    
    return () => {
      cursor.style.animation = 'none';
    };
  }, [isStreaming]);

  if (!part || part.type !== 'text') return null;

  return (
    <div className="relative">
      <Markdown content={part.text} />
      {isStreaming && (
        <span
          ref={cursorRef}
          className="inline-block w-0.5 h-4 bg-primary ml-0.5"
          style={{
            animation: 'blink 1s step-start infinite',
          }}
        />
      )}
    </div>
  );
});
```

### Streaming Hook
```tsx
// hooks/useStreaming.ts
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useEventSubscription } from './useEventSubscription';
import type { Part, TextPart } from '@/lib/opencode';

export interface StreamingState {
  isStreaming: boolean;
  currentPartId: string | null;
  delta: string;
}

export function useStreaming(messageId: string) {
  const streamingRef = useRef<Map<string, string>>(new Map());

  // Track delta events
  useEventSubscription('message.part.updated', (event) => {
    const { part, delta } = event.properties;
    
    if (part.messageID !== messageId) return;
    if (part.type !== 'text') return;
    if (!delta) return;

    // Accumulate delta (SSE sends partial updates)
    const current = streamingRef.current.get(part.id) ?? '';
    streamingRef.current.set(part.id, current + delta);
  });

  const isStreaming = useCallback((partId: string) => {
    return streamingRef.current.has(partId);
  }, []);

  return { isStreaming };
}
```

### Tool Status Transition
```tsx
// components/session/parts/tool-status.tsx
import { memo, useEffect, useState } from 'react';
import { Loader2, Check, X, Clock, Play } from 'lucide-react';
import type { ToolPart } from '@/lib/opencode';

interface ToolStatusProps {
  state: ToolPart['state'];
}

export const ToolStatus = memo(function ToolStatus({ state }: ToolStatusProps) {
  const [prevStatus, setPrevStatus] = useState(state.status);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (state.status !== prevStatus) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevStatus(state.status);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.status, prevStatus]);

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      label: 'Pending',
    },
    running: {
      icon: Loader2,
      color: 'text-primary',
      bg: 'bg-primary/10',
      label: 'Running',
      animate: true,
    },
    completed: {
      icon: Check,
      color: 'text-success',
      bg: 'bg-success/10',
      label: 'Completed',
    },
    error: {
      icon: X,
      color: 'text-error',
      bg: 'bg-error/10',
      label: 'Error',
    },
  };

  const config = statusConfig[state.status];
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs
        ${config.bg} ${config.color}
        ${isTransitioning ? 'animate-pulse' : ''}
      `}
    >
      <Icon className={`h-3 w-3 ${config.animate ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
      {'time' in state && state.time.end && (
        <span className="ml-1 opacity-70">
          {((state.time.end - state.time.start) / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
});
```

### Streaming Indicator
```tsx
// components/session/streaming-indicator.tsx
import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

interface StreamingIndicatorProps {
  sessionId: string;
}

export const StreamingIndicator = memo(function StreamingIndicator({
  sessionId,
}: StreamingIndicatorProps) {
  const { status, isWorking } = useSession(sessionId);

  if (!isWorking) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-y border-primary/20">
      <Loader2 className="h-4 w-4 text-primary animate-spin" />
      <span className="text-sm text-primary">
        {status.type === 'retry' ? (
          `Retrying in ${Math.ceil((status.next - Date.now()) / 1000)}s...`
        ) : (
          'Generating response...'
        )}
      </span>
    </div>
  );
});
```

### CSS for Cursor Blink
```css
/* globals.css */
@keyframes blink {
  50% {
    opacity: 0;
  }
}
```

## Dependencies
- 12-connection-sse-sync
- 19-session-part-rendering

## Estimated Effort
1 day

## Notes
- SSE sends delta updates that need accumulation
- Tool states transition: pending → running → completed/error
- Consider debouncing rapid updates for performance
- [2026-01-01]: Added typewriter streaming with cursor and auto-scroll during updates. Files: components/session/typewriter-effect.tsx, components/session/parts/text-part.tsx, components/session/parts/reasoning-part.tsx, components/session/message-list.tsx, app/globals.css
