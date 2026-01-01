# Error Handling and Notifications

## Context
Implement comprehensive error handling with user-friendly notifications. Errors should be caught at component boundaries, displayed gracefully, and logged for debugging.

## Acceptance Criteria
- [x] Global error boundary component
- [ ] Toast notification system
- [ ] API error handling with user messages
- [ ] Connection error recovery UI
- [ ] Session error display (from SSE events)
- [ ] Retry mechanisms for transient failures
- [x] Error logging for debugging
- [x] Fallback UI for crashed components

## Technical Guidance

### Toast System
```tsx
// components/ui/toast.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import { tv } from 'tailwind-variants';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

const toastVariants = tv({
  base: 'flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm',
  variants: {
    variant: {
      success: 'bg-success/10 border-success/30 text-success',
      error: 'bg-error/10 border-error/30 text-error',
      warning: 'bg-warning/10 border-warning/30 text-warning',
      info: 'bg-info/10 border-info/30 text-info',
    },
  },
});

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.variant];
        return (
          <div key={toast.id} className={toastVariants({ variant: toast.variant })}>
            <Icon className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.description && (
                <p className="text-sm opacity-80">{toast.description}</p>
              )}
            </div>
            <button onClick={() => onRemove(toast.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

### Error Boundary
```tsx
// components/error-boundary.tsx
import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-error mb-4" />
          <h2 className="text-lg font-medium mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <Button onPress={this.handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Wrapper
```tsx
// lib/utils/api-error.ts
import type { OpenCodeError } from '@/lib/opencode/errors';

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific OpenCode errors
    if ('code' in error) {
      const ocError = error as OpenCodeError;
      switch (ocError.code) {
        case 'CONNECTION_ERROR':
          return 'Unable to connect to OpenCode server. Make sure it is running.';
        case 'SESSION_NOT_FOUND':
          return 'Session not found. It may have been deleted.';
        case 'NOT_FOUND':
          return 'The requested resource was not found.';
        default:
          return ocError.message;
      }
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}

// Hook for API calls with error handling
export function useApiError() {
  const { addToast } = useToast();

  const handleError = useCallback((error: unknown, context?: string) => {
    const message = getErrorMessage(error);
    addToast({
      title: context ? `Error: ${context}` : 'Error',
      description: message,
      variant: 'error',
    });
  }, [addToast]);

  return { handleError };
}
```

### Session Error Listener
```tsx
// hooks/useSessionErrors.ts
import { useEffect } from 'react';
import { useEventSubscription } from './useEventSubscription';
import { useToast } from '@/components/ui/toast';

export function useSessionErrors() {
  const { addToast } = useToast();

  useEventSubscription('session.error', (event) => {
    const { error } = event.properties;
    if (!error) return;

    let title = 'Session Error';
    let description = 'An error occurred';

    switch (error.name) {
      case 'ProviderAuthError':
        title = 'Authentication Failed';
        description = `Provider ${error.data.providerID}: ${error.data.message}`;
        break;
      case 'APIError':
        title = 'API Error';
        description = error.data.message;
        break;
      case 'MessageAbortedError':
        title = 'Generation Stopped';
        description = error.data.message;
        break;
      default:
        description = 'data' in error ? (error.data as any).message : 'Unknown error';
    }

    addToast({ title, description, variant: 'error' });
  });
}
```

## Dependencies
- 04-foundation-core-providers
- 12-connection-sse-sync

## Estimated Effort
1 day

## Notes
- Toast notifications should be dismissible
- Error boundaries prevent full app crashes
- Consider error reporting to external service
- 2026-01-01: Added ErrorBoundary wrapper with fallback UI and console logging; toast/retry handling deferred.
