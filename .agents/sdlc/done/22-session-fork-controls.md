# Fork Controls

## Context
Allow users to fork a session from any message, creating a new session that branches from that point. The default behavior is "continue" (no fork), but users can explicitly choose to fork when needed.

## Acceptance Criteria
- [x] Fork button on each user message
- [x] Fork creates new session with history up to that point
- [x] Navigate to forked session after creation
- [x] Show fork indicator in tree visualization
- [x] Undo/redo functionality using session.revert
- [x] Visual feedback during fork operation
- [x] Fork count indicator on messages with forks

## Technical Guidance

### Message Actions Component
```tsx
// components/session/message-actions.tsx
import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { useSession } from '@/hooks/useSession';
import { usePanes } from '@/context/PanesProvider';
import { SessionPane } from '@/components/panes/session-pane';
import { 
  GitFork, 
  MoreHorizontal, 
  Copy, 
  Undo, 
  Trash2,
  Loader2 
} from 'lucide-react';

interface MessageActionsProps {
  sessionId: string;
  messageId: string;
  isUserMessage: boolean;
}

export const MessageActions = memo(function MessageActions({
  sessionId,
  messageId,
  isUserMessage,
}: MessageActionsProps) {
  const { fork } = useSession(sessionId);
  const panes$ = usePanes();
  const [isForking, setIsForking] = useState(false);

  const handleFork = useCallback(async () => {
    setIsForking(true);
    try {
      const newSession = await fork(messageId);
      
      // Navigate to new session
      panes$.openPane({
        type: 'session',
        component: <SessionPane sessionId={newSession.id} />,
        title: newSession.title || 'Forked Session',
      });
    } finally {
      setIsForking(false);
    }
  }, [fork, messageId, panes$]);

  const handleCopy = useCallback(() => {
    // Copy message content to clipboard
    // Implementation depends on how you want to format the content
  }, []);

  if (!isUserMessage) return null;

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Fork button */}
      <Button
        variant="ghost"
        size="icon"
        onPress={handleFork}
        isDisabled={isForking}
        aria-label="Fork from this message"
      >
        {isForking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GitFork className="h-4 w-4" />
        )}
      </Button>

      {/* More actions */}
      <MenuTrigger>
        <Button variant="ghost" size="icon" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        <Menu>
          <MenuItem onAction={handleCopy} icon={<Copy className="h-4 w-4" />}>
            Copy
          </MenuItem>
          <MenuItem onAction={handleFork} icon={<GitFork className="h-4 w-4" />}>
            Fork from here
          </MenuItem>
        </Menu>
      </MenuTrigger>
    </div>
  );
});
```

### Undo/Redo Controls
```tsx
// components/session/undo-redo.tsx
import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { Undo, Redo } from 'lucide-react';
import { sessionService } from '@/lib/opencode/sessions';

interface UndoRedoProps {
  sessionId: string;
}

export const UndoRedo = memo(function UndoRedo({ sessionId }: UndoRedoProps) {
  const { session, messages, isWorking } = useSession(sessionId);

  const userMessages = messages.filter(m => m.role === 'user');
  const canUndo = userMessages.length > 0 && !isWorking;
  const canRedo = !!session?.revert?.messageID;

  const handleUndo = useCallback(async () => {
    if (!canUndo) return;
    
    // Find the last user message
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (!lastUserMessage) return;

    // Revert to before this message
    await sessionService.revert(sessionId, lastUserMessage.id);
  }, [sessionId, userMessages, canUndo]);

  const handleRedo = useCallback(async () => {
    if (!canRedo) return;
    await sessionService.unrevert(sessionId);
  }, [sessionId, canRedo]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onPress={handleUndo}
        isDisabled={!canUndo}
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onPress={handleRedo}
        isDisabled={!canRedo}
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
});
```

### Fork Indicator in Message Turn
```tsx
// Add to components/session/message-turn.tsx
import { useSessions } from '@/hooks/useSessions';

// In MessageTurn component:
const { sessions } = useSessions();
const forkCount = sessions.filter(s => 
  s.parentID === sessionId && 
  messages.some(m => m.id === userMessage.id)
).length;

// In the render:
{forkCount > 0 && (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
    <GitFork className="h-3 w-3" />
    {forkCount}
  </span>
)}
```

### Session Pane Header with Undo/Redo
```tsx
// components/panes/session-pane.tsx
import { UndoRedo } from '@/components/session/undo-redo';

export function SessionPane({ sessionId }: { sessionId: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm font-medium">Session</span>
        <UndoRedo sessionId={sessionId} />
      </div>
      <div className="flex-1 overflow-hidden">
        <MessageList sessionId={sessionId} />
      </div>
      <div className="p-4 border-t border-border">
        <PromptInput sessionId={sessionId} />
      </div>
    </div>
  );
}
```

## Dependencies
- 18-session-message-list
- 13-connection-session-crud
- 06-ui-dialog-menu

## Estimated Effort
1 day

## Notes
- Fork is explicit action, not default
- Undo uses session.revert, redo uses session.unrevert
- Forked sessions appear in the tree with parentID set
- [2026-01-01]: Added fork controls, undo/redo, and fork counts with pane navigation. Files: components/session/fork-controls.tsx, components/session/message-turn.tsx, components/session/message-list.tsx, components/panes/session-pane.tsx
