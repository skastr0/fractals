# Subagent Visualization

## Context
Subagent sessions (depth > 0) need special visual treatment to show the agent hierarchy. This includes visual nesting, connecting lines to parent sessions, and potentially collapsible groups for complex agent trees.

## Acceptance Criteria
- [x] Subagent nodes visually distinct from root sessions
- [x] Depth indication (color gradient or indentation)
- [x] Collapsible subagent groups
- [x] Subagent count badge on parent nodes
- [x] Visual grouping with background regions
- [x] Animated expansion/collapse
- [x] Highlight subagent chain when any node is selected

## Technical Guidance

### Enhanced Session Node for Subagents
```tsx
// components/graph/session-node.tsx (additions)
import { useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';

// Add to SessionNodeData
export interface SessionNodeData {
  // ... existing fields
  childCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Add collapse toggle to node
export const SessionNode = memo(function SessionNode({ data, selected }: NodeProps<SessionNodeData>) {
  const hasChildren = (data.childCount ?? 0) > 0;

  return (
    <div className={styles.root()}>
      {/* ... existing content */}

      {/* Child count and collapse toggle */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse?.();
          }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs hover:bg-secondary/80"
        >
          {data.isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <Users className="h-3 w-3" />
          <span>{data.childCount}</span>
        </button>
      )}
    </div>
  );
});
```

### Collapse State Management
```tsx
// hooks/useSessionGraph.ts (additions)
export function useSessionGraph() {
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((sessionId: string) => {
    setCollapsedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const tree = buildSessionTree(sessions);
    
    // Filter out collapsed children
    const filterCollapsed = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (collapsedSessions.has(node.session.id)) {
          // Keep node but remove children from display
          return { ...node, children: [] };
        }
        return {
          ...node,
          children: filterCollapsed(node.children),
        };
      });
    };

    const filteredTree = filterCollapsed(tree);
    
    // Count original children for badge
    const childCounts = new Map<string, number>();
    const countChildren = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        childCounts.set(node.session.id, node.children.length);
        countChildren(node.children);
      }
    };
    countChildren(tree);

    // Build elements with collapse info
    const { nodes: flowNodes, edges: flowEdges } = treeToFlowElements(
      filteredTree,
      selectedSessionId,
      sync.data.session_status,
    );

    // Enhance nodes with collapse data
    const enhancedNodes = flowNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        childCount: childCounts.get(node.id) ?? 0,
        isCollapsed: collapsedSessions.has(node.id),
        onToggleCollapse: () => toggleCollapse(node.id),
      },
    }));

    return applyDagreLayout(enhancedNodes, flowEdges);
  }, [sessions, collapsedSessions, selectedSessionId, sync.data.session_status, toggleCollapse]);

  return { nodes, edges, toggleCollapse, collapsedSessions };
}
```

### Subagent Group Background
```tsx
// components/graph/subagent-group.tsx
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

export interface SubagentGroupData {
  parentId: string;
  bounds: { x: number; y: number; width: number; height: number };
  depth: number;
}

export const SubagentGroup = memo(function SubagentGroup({
  data,
}: NodeProps<SubagentGroupData>) {
  // Color based on depth
  const bgOpacity = Math.max(0.02, 0.08 - data.depth * 0.02);

  return (
    <div
      className="absolute rounded-lg border border-dashed border-secondary/30"
      style={{
        left: data.bounds.x,
        top: data.bounds.y,
        width: data.bounds.width,
        height: data.bounds.height,
        backgroundColor: `hsl(var(--secondary) / ${bgOpacity})`,
        pointerEvents: 'none',
      }}
    />
  );
});
```

### Depth-Based Styling
```tsx
// lib/graph/depth-styles.ts
const DEPTH_COLORS = [
  'hsl(var(--primary))',       // depth 0 - root
  'hsl(var(--secondary))',     // depth 1
  'hsl(217 70% 50%)',          // depth 2
  'hsl(217 60% 45%)',          // depth 3
  'hsl(217 50% 40%)',          // depth 4+
];

export function getDepthColor(depth: number): string {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
}

export function getDepthBorderStyle(depth: number): string {
  if (depth === 0) return 'border-l-0';
  return `border-l-4`;
}

export function getDepthScale(depth: number): number {
  // Slightly smaller nodes at deeper levels
  return Math.max(0.85, 1 - depth * 0.05);
}
```

### Highlight Chain on Selection
```tsx
// hooks/useSessionGraph.ts (additions)
const highlightedSessions = useMemo(() => {
  if (!selectedSessionId) return new Set<string>();
  
  const tree = buildSessionTree(sessions);
  const path = findPathToSession(tree, selectedSessionId);
  
  if (!path) return new Set<string>();
  
  // Highlight all ancestors and descendants
  const ancestors = new Set(path.map((n) => n.session.id));
  const descendants = getDescendants(tree, selectedSessionId);
  
  return new Set([
    ...ancestors,
    ...descendants.map((s) => s.id),
  ]);
}, [sessions, selectedSessionId]);

// Use in edge styling
const edgeStyle = {
  stroke: highlightedSessions.has(edge.target)
    ? 'hsl(var(--primary))'
    : 'hsl(var(--border))',
  strokeWidth: highlightedSessions.has(edge.target) ? 2 : 1,
};
```

## Dependencies
- 15-graph-session-node
- 16-graph-tree-builder

## Estimated Effort
1 day

## Notes
- Collapse state could be persisted to localStorage
- Consider max depth limit for visual clarity
- Animation with Framer Motion for smooth collapse/expand
- 2025-12-31: Added subagent collapse toggles, child badges, highlight chain, depth accents, and group background nodes for hierarchy visualization.
