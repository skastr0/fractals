# Session Node Component

## Context
Create the custom ReactFlow node component for sessions. Each node displays session title, status, timestamp, and visual indicators. The node style should differentiate between root sessions and subagent sessions.

## Acceptance Criteria
- [x] Session node displays title
- [x] Status indicator (dot)
- [x] Timestamp display (relative time)
- [x] Visual distinction for subagent sessions (border + depth badge)
- [x] Selected state styling
- [x] Hover state with subtle highlight

## Technical Guidance

### Session Node Component
```tsx
// components/graph/session-node.tsx
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { tv } from 'tailwind-variants';
import { StatusDot } from '@/components/ui/status-dot';
import { formatRelativeTime } from '@/lib/utils/date';
import { GitBranch, FileCode, Plus, Minus } from 'lucide-react';

const nodeVariants = tv({
  slots: {
    root: [
      'relative px-4 py-3 rounded-lg border bg-background/95 backdrop-blur-sm',
      'transition-all duration-200',
      'min-w-[260px] max-w-[300px]',
    ],
    header: 'flex items-start justify-between gap-2 mb-2',
    title: 'text-sm font-medium text-foreground truncate flex-1',
    statusContainer: 'flex items-center gap-1.5',
    meta: 'flex items-center gap-3 text-xs text-muted-foreground',
    diffStats: 'flex items-center gap-2',
    subagentBadge: 'text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground',
  },
  variants: {
    selected: {
      true: {
        root: 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/50',
      },
      false: {
        root: 'border-border hover:border-border/80',
      },
    },
    isSubagent: {
      true: {
        root: 'border-l-4 border-l-secondary',
      },
    },
    status: {
      idle: {},
      busy: {
        root: 'border-primary/50',
      },
      retry: {
        root: 'border-warning/50',
      },
      pending_permission: {
        root: 'border-error/50',
      },
    },
  },
  defaultVariants: {
    selected: false,
    isSubagent: false,
    status: 'idle',
  },
});

export interface SessionNodeData {
  sessionId: string;
  title: string;
  status: 'idle' | 'busy' | 'retry' | 'pending_permission';
  depth: number;
  isSubagent: boolean;
  isSelected: boolean;
  updatedAt: number;
  summary?: {
    additions: number;
    deletions: number;
    files: number;
  };
  agent?: string;
}

export const SessionNode = memo(function SessionNode({
  data,
  selected,
}: NodeProps<SessionNodeData>) {
  const styles = nodeVariants({
    selected: data.isSelected || selected,
    isSubagent: data.isSubagent,
    status: data.status,
  });

  return (
    <div className={styles.root()}>
      {/* Target handle (for incoming edges) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-border !w-3 !h-1.5 !rounded-sm !border-0"
      />

      {/* Header */}
      <div className={styles.header()}>
        <span className={styles.title()} title={data.title}>
          {data.title || 'Untitled Session'}
        </span>
        <div className={styles.statusContainer()}>
          <StatusDot status={data.status} size="sm" />
        </div>
      </div>

      {/* Metadata */}
      <div className={styles.meta()}>
        {/* Time */}
        <span>{formatRelativeTime(data.updatedAt)}</span>

        {/* Subagent indicator */}
        {data.isSubagent && (
          <span className={styles.subagentBadge()}>
            <GitBranch className="h-3 w-3 inline mr-0.5" />
            depth {data.depth}
          </span>
        )}

        {/* Agent name */}
        {data.agent && (
          <span className="text-primary">{data.agent}</span>
        )}
      </div>

      {/* Diff summary */}
      {data.summary && data.summary.files > 0 && (
        <div className={`${styles.diffStats()} mt-2 pt-2 border-t border-border`}>
          <span className="flex items-center gap-0.5">
            <FileCode className="h-3 w-3" />
            {data.summary.files}
          </span>
          <span className="flex items-center gap-0.5 text-success">
            <Plus className="h-3 w-3" />
            {data.summary.additions}
          </span>
          <span className="flex items-center gap-0.5 text-error">
            <Minus className="h-3 w-3" />
            {data.summary.deletions}
          </span>
        </div>
      )}

      {/* Source handle (for outgoing edges) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border !w-3 !h-1.5 !rounded-sm !border-0"
      />
    </div>
  );
});
```

### Compact Session Node (for dense views)
```tsx
// components/graph/session-node-compact.tsx
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StatusDot } from '@/components/ui/status-dot';
import type { SessionNodeData } from './session-node';

export const SessionNodeCompact = memo(function SessionNodeCompact({
  data,
  selected,
}: NodeProps<SessionNodeData>) {
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md border bg-background
        ${selected || data.isSelected ? 'border-primary' : 'border-border'}
        ${data.isSubagent ? 'opacity-80' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      
      <StatusDot status={data.status} size="sm" />
      <span className="text-xs font-medium truncate max-w-[120px]">
        {data.title || 'Session'}
      </span>
      
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
});
```

### Edge Styles
```tsx
// components/graph/custom-edge.tsx
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

interface CustomEdgeData {
  isActive?: boolean;
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CustomEdgeData>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected
          ? 'hsl(var(--primary))'
          : data?.isActive
          ? 'hsl(var(--primary) / 0.5)'
          : 'hsl(var(--border))',
        strokeWidth: selected ? 2 : 1,
      }}
      className={data?.isActive ? 'animate-pulse' : ''}
    />
  );
}
```

## Dependencies
- 14-graph-reactflow-setup
- 09-ui-status-indicators

## Estimated Effort
1 day

## Notes
- Memo the component for performance
- Handle visibility can be adjusted with CSS
- Consider adding a "collapse children" feature for large trees
- [2025-12-31]: Implemented node title, status dot, relative time, subagent styling, hover, and selection. Diff summary/agent indicator deferred to later scope.
