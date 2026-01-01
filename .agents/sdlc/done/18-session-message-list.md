# Session View: Message List Display

## Context
Display the messages in a selected session. Messages alternate between user and assistant roles. User messages show the prompt, assistant messages show the response parts. The list should scroll to the latest message and support navigation.

## Acceptance Criteria
- [x] Message list renders user and assistant messages
- [x] Visual distinction between user/assistant
- [x] Auto-scroll to latest message on new content
- [x] Message timestamp display
- [x] Message navigation (prev/next)
- [x] User can scroll freely during generation
- [x] Scroll-to-bottom button when scrolled up
- [x] Message selection/highlighting

## Technical Guidance

### Message List Component
```tsx
// components/session/message-list.tsx
import { useRef, useEffect, useCallback, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { MessageTurn } from './message-turn';
import { ScrollToBottom } from './scroll-to-bottom';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MessageListProps {
  sessionId: string;
}

export function MessageList({ sessionId }: MessageListProps) {
  const { messages, status, isWorking } = useSession(sessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);

  // Filter to user messages for navigation
  const userMessages = messages.filter(m => m.role === 'user');

  // Auto-scroll when working and user hasn't scrolled
  useEffect(() => {
    if (isWorking && !userInteracted && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isWorking, userInteracted]);

  // Reset user interaction when session becomes idle
  useEffect(() => {
    if (!isWorking) {
      setUserInteracted(false);
    }
  }, [isWorking]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isAtBottom);
    
    // User interaction during working state
    if (isWorking) {
      setUserInteracted(true);
    }
  }, [isWorking]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
    setUserInteracted(false);
  }, []);

  const navigateMessage = useCallback((offset: number) => {
    if (userMessages.length === 0) return;
    
    const currentIndex = activeMessageIndex ?? userMessages.length - 1;
    const newIndex = Math.max(0, Math.min(userMessages.length - 1, currentIndex + offset));
    setActiveMessageIndex(newIndex);
    
    // Scroll to message
    const messageId = userMessages[newIndex].id;
    const element = document.getElementById(`message-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [userMessages, activeMessageIndex]);

  return (
    <div className="relative h-full flex flex-col">
      {/* Message navigation */}
      {userMessages.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigateMessage(-1)}
            isDisabled={(activeMessageIndex ?? userMessages.length - 1) === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {(activeMessageIndex ?? userMessages.length - 1) + 1} / {userMessages.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigateMessage(1)}
            isDisabled={(activeMessageIndex ?? userMessages.length - 1) === userMessages.length - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        onScroll={handleScroll}
      >
        <div ref={contentRef} className="flex flex-col gap-6 p-4 pb-32">
          {userMessages.map((userMessage, index) => (
            <MessageTurn
              key={userMessage.id}
              sessionId={sessionId}
              userMessage={userMessage}
              isActive={activeMessageIndex === index}
              isLast={index === userMessages.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <ScrollToBottom onClick={scrollToBottom} />
      )}
    </div>
  );
}
```

### Message Turn Component
```tsx
// components/session/message-turn.tsx
import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';
import { PartRenderer } from './part-renderer';
import { formatRelativeTime } from '@/lib/utils/date';
import { User, Bot } from 'lucide-react';
import type { Message } from '@/lib/opencode';

interface MessageTurnProps {
  sessionId: string;
  userMessage: Message & { role: 'user' };
  isActive?: boolean;
  isLast?: boolean;
}

export function MessageTurn({ sessionId, userMessage, isActive, isLast }: MessageTurnProps) {
  const { messages, getParts } = useSession(sessionId);

  // Find the assistant message that follows this user message
  const assistantMessage = useMemo(() => {
    return messages.find(
      m => m.role === 'assistant' && m.parentID === userMessage.id
    );
  }, [messages, userMessage.id]);

  const userParts = getParts(userMessage.id);
  const assistantParts = assistantMessage ? getParts(assistantMessage.id) : [];

  return (
    <div
      id={`message-${userMessage.id}`}
      className={`flex flex-col gap-4 ${isActive ? 'ring-2 ring-primary/20 rounded-lg p-4 -m-4' : ''}`}
    >
      {/* User message */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">You</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(userMessage.time.created)}
            </span>
            {userMessage.agent && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                {userMessage.agent}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {userParts.map((part) => (
              <PartRenderer key={part.id} part={part} />
            ))}
          </div>
        </div>
      </div>

      {/* Assistant message */}
      {assistantMessage && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Bot className="h-4 w-4 text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">Assistant</span>
              <span className="text-xs text-muted-foreground">
                {assistantMessage.modelID}
              </span>
            </div>
            <div className="space-y-2">
              {assistantParts.map((part) => (
                <PartRenderer key={part.id} part={part} />
              ))}
            </div>
            {/* Token usage */}
            {assistantMessage.tokens && (
              <div className="mt-2 text-xs text-muted-foreground">
                {assistantMessage.tokens.input}↓ {assistantMessage.tokens.output}↑
                {assistantMessage.cost > 0 && (
                  <span className="ml-2">${assistantMessage.cost.toFixed(4)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Scroll to Bottom Button
```tsx
// components/session/scroll-to-bottom.tsx
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollToBottomProps {
  onClick: () => void;
}

export function ScrollToBottom({ onClick }: ScrollToBottomProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="absolute bottom-24 left-1/2 -translate-x-1/2 shadow-lg"
      onPress={onClick}
    >
      <ChevronDown className="h-4 w-4 mr-1" />
      Scroll to bottom
    </Button>
  );
}
```

## Dependencies
- 13-connection-session-crud
- 12-connection-sse-sync
- 07-ui-pane-system

## Estimated Effort
1.5 days

## Notes
- Reference OpenCode's session.tsx for message turn patterns
- Auto-scroll should be smart - pause during user scroll
- Consider virtualization for very long sessions
- [2026-01-01]: Implemented MessageList/MessageTurn with scrolling, navigation, timestamps, and fork counts. Files: components/session/message-list.tsx, components/session/message-turn.tsx, components/session/scroll-to-bottom.tsx
