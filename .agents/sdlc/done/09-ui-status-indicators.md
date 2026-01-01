# Session Status Indicators

## Context
Sessions in OpenCode have various states: idle, busy, retry, pending_permission. We need visual indicators that clearly communicate session status throughout the UI - in the graph nodes, pane headers, and anywhere session state is relevant.

## Acceptance Criteria
- [x] SessionStatusBadge component with all status variants
- [x] StatusDot component for compact indicators
- [x] Animation for "busy" state (pulsing/spinner)
- [x] Animation for "retry" state (with countdown)
- [x] "Pending permission" indicator with action hint
- [x] Integration points defined for nodes and panes
- [x] Consistent color coding across all indicators
- [x] Accessible labels for screen readers

## Technical Guidance

### Session Status Types (from SDK)
```tsx
// types/session.ts
export type SessionStatus =
  | { type: 'idle' }
  | { type: 'busy' }
  | { type: 'retry'; attempt: number; message: string; next: number }
  | { type: 'pending_permission' };
```

### Status Badge Component
```tsx
// components/ui/session-status-badge.tsx
import { tv, type VariantProps } from 'tailwind-variants';
import { Loader2, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const statusBadgeVariants = tv({
  base: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
  variants: {
    status: {
      idle: 'bg-muted text-muted-foreground',
      busy: 'bg-primary/20 text-primary',
      retry: 'bg-warning/20 text-warning',
      pending_permission: 'bg-error/20 text-error',
    },
  },
});

interface SessionStatusBadgeProps {
  status: SessionStatus;
  showLabel?: boolean;
}

export function SessionStatusBadge({ status, showLabel = true }: SessionStatusBadgeProps) {
  const getIcon = () => {
    switch (status.type) {
      case 'idle':
        return <CheckCircle className="h-3 w-3" />;
      case 'busy':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'retry':
        return <Clock className="h-3 w-3" />;
      case 'pending_permission':
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getLabel = () => {
    switch (status.type) {
      case 'idle':
        return 'Idle';
      case 'busy':
        return 'Running';
      case 'retry':
        return `Retry in ${Math.ceil((status.next - Date.now()) / 1000)}s`;
      case 'pending_permission':
        return 'Awaiting permission';
    }
  };

  return (
    <span
      className={statusBadgeVariants({ status: status.type })}
      role="status"
      aria-label={getLabel()}
    >
      {getIcon()}
      {showLabel && <span>{getLabel()}</span>}
    </span>
  );
}
```

### Status Dot (Compact)
```tsx
// components/ui/status-dot.tsx
import { tv } from 'tailwind-variants';

const statusDotVariants = tv({
  base: 'rounded-full',
  variants: {
    status: {
      idle: 'bg-muted-foreground',
      busy: 'bg-primary animate-pulse',
      retry: 'bg-warning',
      pending_permission: 'bg-error animate-pulse',
    },
    size: {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface StatusDotProps {
  status: SessionStatus['type'];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusDot({ status, size, className }: StatusDotProps) {
  return (
    <span
      className={statusDotVariants({ status, size, className })}
      aria-hidden="true"
    />
  );
}
```

### Retry Timer Component
```tsx
// components/ui/retry-timer.tsx
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface RetryTimerProps {
  nextRetryMs: number;
  attempt: number;
  message: string;
}

export function RetryTimer({ nextRetryMs, attempt, message }: RetryTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => 
    Math.ceil((nextRetryMs - Date.now()) / 1000)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.ceil((nextRetryMs - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRetryMs]);

  return (
    <div className="flex items-center gap-2 text-warning">
      <Clock className="h-4 w-4" />
      <span className="text-sm">
        Retry #{attempt} in {secondsLeft}s
      </span>
      <span className="text-xs text-muted-foreground">{message}</span>
    </div>
  );
}
```

### Permission Pending Component
```tsx
// components/ui/permission-pending.tsx
import { AlertCircle, Check, X } from 'lucide-react';
import { Button } from './button';

interface PermissionPendingProps {
  sessionId: string;
  onApprove: () => void;
  onDeny: () => void;
}

export function PermissionPending({ sessionId, onApprove, onDeny }: PermissionPendingProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-error/50 bg-error/10 px-3 py-2">
      <AlertCircle className="h-5 w-5 text-error" />
      <span className="text-sm text-error">Permission required</span>
      <div className="flex items-center gap-1 ml-auto">
        <Button size="sm" variant="ghost" onPress={onApprove}>
          <Check className="h-4 w-4 text-success" />
        </Button>
        <Button size="sm" variant="ghost" onPress={onDeny}>
          <X className="h-4 w-4 text-error" />
        </Button>
      </div>
    </div>
  );
}
```

### Status Hook
```tsx
// hooks/useSessionStatus.ts
import { useSync } from '@/context/SyncProvider';

export function useSessionStatus(sessionId: string) {
  const sync = useSync();
  return sync.data.session_status[sessionId] ?? { type: 'idle' as const };
}
```

## Dependencies
- 05-ui-primitive-components
- 02-foundation-react-aria-tailwind

## Estimated Effort
1 day

## Notes
- Status colors should match OpenCode's TUI theme
- Consider adding sound/notification for permission requests
- Retry timer should count down in real-time
- [2025-12-31]: Implemented SessionStatusBadge, StatusDot, and useSessionStatus hook with countdown/animations; exported UI components for node/pane integration. Files: components/ui/session-status-badge.tsx, components/ui/status-dot.tsx, components/ui/index.ts, hooks/useSessionStatus.ts
