# Performance Optimization

## Context
Ensure the application performs well with many sessions, messages, and real-time updates. This includes optimizing React renders, virtualizing long lists, and managing memory for SSE streams.

## Acceptance Criteria
- [ ] Virtualized session list for large counts
- [ ] Virtualized message list for long sessions
- [x] Memoized components to prevent re-renders
- [ ] Efficient SSE event handling
- [ ] Lazy loading of pane content
- [ ] Bundle size optimization
- [ ] Performance monitoring (dev mode)
- [ ] No memory leaks from subscriptions

## Technical Guidance

### Virtualized Lists
```tsx
// components/ui/virtualized-list.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize: number;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize,
  overscan = 5,
  className,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div ref={parentRef} className={`overflow-auto ${className}`}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Memoization Patterns
```tsx
// Memoize expensive computations
const expensiveNodes = useMemo(() => {
  return computeLayout(sessions);
}, [sessions]);

// Memoize callbacks
const handleNodeClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);

// Memoize components
export const SessionNode = memo(function SessionNode({ data }: Props) {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return prevProps.data.id === nextProps.data.id &&
         prevProps.data.status === nextProps.data.status;
});
```

### Efficient SSE Handling
```tsx
// context/SyncProvider.tsx (optimizations)
import { batch } from '@legendapp/state';

// Batch multiple updates together
const handleEvents = useCallback((events: Event[]) => {
  batch(() => {
    for (const event of events) {
      handleEvent(event);
    }
  });
}, [handleEvent]);

// Throttle rapid updates
import { throttle } from 'lodash-es';

const throttledUpdate = useMemo(
  () => throttle((part: Part) => {
    state$.data.parts[part.messageID].set((prev) => {
      const index = prev.findIndex(p => p.id === part.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = part;
        return next;
      }
      return [...prev, part];
    });
  }, 50),
  [state$]
);
```

### Lazy Loading Panes
```tsx
// components/panes/lazy-pane.tsx
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
const ConfigEditor = lazy(() => import('./config-editor'));
const MetadataPane = lazy(() => import('./metadata-pane'));

export function LazyPane({ type, ...props }: { type: string }) {
  const Component = {
    config: ConfigEditor,
    metadata: MetadataPane,
  }[type];

  if (!Component) return null;

  return (
    <Suspense fallback={<PaneLoader />}>
      <Component {...props} />
    </Suspense>
  );
}

function PaneLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
```

### Memory Leak Prevention
```tsx
// hooks/useCleanup.ts
import { useEffect, useRef } from 'react';

export function useCleanup() {
  const cleanupFns = useRef<(() => void)[]>([]);

  const addCleanup = (fn: () => void) => {
    cleanupFns.current.push(fn);
  };

  useEffect(() => {
    return () => {
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
    };
  }, []);

  return addCleanup;
}

// Usage in SSE subscription
useEffect(() => {
  const abortController = new AbortController();
  
  const subscribe = async () => {
    // ...subscription logic
  };
  
  subscribe();
  
  return () => {
    abortController.abort();
  };
}, []);
```

### Performance Monitoring (Dev)
```tsx
// lib/perf/monitor.ts
const isDev = process.env.NODE_ENV === 'development';

export function measureRender(name: string, fn: () => void) {
  if (!isDev) {
    fn();
    return;
  }

  const start = performance.now();
  fn();
  const end = performance.now();
  
  if (end - start > 16) { // More than one frame
    console.warn(`Slow render: ${name} took ${(end - start).toFixed(2)}ms`);
  }
}

// React DevTools profiler wrapper
export function ProfiledComponent({ id, children }: { id: string; children: React.ReactNode }) {
  if (!isDev) return <>{children}</>;

  return (
    <Profiler
      id={id}
      onRender={(id, phase, actualDuration) => {
        if (actualDuration > 16) {
          console.warn(`Slow component: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);
        }
      }}
    >
      {children}
    </Profiler>
  );
}
```

### Bundle Optimization
```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@xyflow/react'],
  },
  webpack: (config) => {
    // Tree shaking for icon libraries
    config.resolve.alias = {
      ...config.resolve.alias,
      'lucide-react': 'lucide-react/dist/esm/icons',
    };
    return config;
  },
};
```

## Dependencies
- All previous work items

## Estimated Effort
1.5 days

## Notes
- Use React DevTools Profiler during development
- Consider Web Workers for heavy computations
- Monitor bundle size with `@next/bundle-analyzer`
- 2026-01-01: Verified memoized graph/session components; added memoized graph node centers for keyboard navigation. Virtualization and SSE tuning deferred.
