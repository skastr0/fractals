# Tree Builder: parentID + depth to Edges

## Context
Sessions have `parentID` (pointing to parent session) and `depth` (nesting level, 0 for root). We need to build edges between sessions to create the tree visualization. This logic converts the flat session list into a proper tree structure.

## Acceptance Criteria
- [x] Build parent-child edges from parentID
- [x] Handle missing parents gracefully
- [x] Sort siblings by creation time
- [x] Support filtering by depth range
- [x] Handle circular reference detection
- [x] Efficient incremental updates on new sessions
- [x] Calculate tree statistics (max depth, node count per level)

## Technical Guidance

### Tree Builder Utility
```tsx
// lib/graph/tree-builder.ts
import type { Session } from '@/lib/opencode';
import type { Node, Edge } from '@xyflow/react';
import type { SessionNodeData } from '@/components/graph/session-node';

export interface TreeNode {
  session: Session;
  children: TreeNode[];
  depth: number;
}

export interface TreeStats {
  totalNodes: number;
  maxDepth: number;
  nodesByDepth: Record<number, number>;
  rootCount: number;
  subagentCount: number;
}

/**
 * Build a tree structure from flat session list
 */
export function buildSessionTree(sessions: Session[]): TreeNode[] {
  // Index by ID for quick lookup
  const byId = new Map<string, Session>();
  const childrenMap = new Map<string, Session[]>();

  // First pass: index all sessions
  for (const session of sessions) {
    byId.set(session.id, session);
    
    // Group by parent
    const parentId = session.parentID ?? '__root__';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(session);
  }

  // Sort children by creation time
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.time.created - b.time.created);
  }

  // Build tree recursively
  const buildNode = (session: Session, visited = new Set<string>()): TreeNode | null => {
    // Circular reference detection
    if (visited.has(session.id)) {
      console.warn(`Circular reference detected: ${session.id}`);
      return null;
    }
    visited.add(session.id);

    const children = (childrenMap.get(session.id) ?? [])
      .map((child) => buildNode(child, new Set(visited)))
      .filter((node): node is TreeNode => node !== null);

    return {
      session,
      children,
      depth: session.depth ?? 0,
    };
  };

  // Start with root sessions (no parent)
  const roots = childrenMap.get('__root__') ?? [];
  return roots
    .map((session) => buildNode(session))
    .filter((node): node is TreeNode => node !== null);
}

/**
 * Flatten tree back to nodes and edges for ReactFlow
 */
export function treeToFlowElements(
  tree: TreeNode[],
  selectedId: string | null,
  statusMap: Record<string, { type: string }>,
): { nodes: Node<SessionNodeData>[]; edges: Edge[] } {
  const nodes: Node<SessionNodeData>[] = [];
  const edges: Edge[] = [];

  const traverse = (node: TreeNode, parentId?: string) => {
    const status = (statusMap[node.session.id]?.type ?? 'idle') as SessionNodeData['status'];
    
    nodes.push({
      id: node.session.id,
      type: 'sessionNode',
      position: { x: 0, y: 0 }, // Dagre will calculate
      data: {
        sessionId: node.session.id,
        title: node.session.title,
        status,
        depth: node.depth,
        isSubagent: node.depth > 0,
        isSelected: node.session.id === selectedId,
        updatedAt: node.session.time.updated,
        summary: node.session.summary,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${node.session.id}`,
        source: parentId,
        target: node.session.id,
        type: 'smoothstep',
        animated: status === 'busy',
      });
    }

    for (const child of node.children) {
      traverse(child, node.session.id);
    }
  };

  for (const root of tree) {
    traverse(root);
  }

  return { nodes, edges };
}

/**
 * Calculate tree statistics
 */
export function getTreeStats(tree: TreeNode[]): TreeStats {
  const stats: TreeStats = {
    totalNodes: 0,
    maxDepth: 0,
    nodesByDepth: {},
    rootCount: tree.length,
    subagentCount: 0,
  };

  const traverse = (node: TreeNode) => {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, node.depth);
    stats.nodesByDepth[node.depth] = (stats.nodesByDepth[node.depth] ?? 0) + 1;
    
    if (node.depth > 0) {
      stats.subagentCount++;
    }

    for (const child of node.children) {
      traverse(child);
    }
  };

  for (const root of tree) {
    traverse(root);
  }

  return stats;
}

/**
 * Find path from root to a specific session
 */
export function findPathToSession(
  tree: TreeNode[],
  targetId: string,
): TreeNode[] | null {
  const traverse = (node: TreeNode, path: TreeNode[]): TreeNode[] | null => {
    const currentPath = [...path, node];
    
    if (node.session.id === targetId) {
      return currentPath;
    }

    for (const child of node.children) {
      const result = traverse(child, currentPath);
      if (result) return result;
    }

    return null;
  };

  for (const root of tree) {
    const result = traverse(root, []);
    if (result) return result;
  }

  return null;
}

/**
 * Get all descendants of a session
 */
export function getDescendants(tree: TreeNode[], sessionId: string): Session[] {
  const descendants: Session[] = [];

  const findAndCollect = (nodes: TreeNode[], collecting = false): boolean => {
    for (const node of nodes) {
      if (collecting) {
        descendants.push(node.session);
        findAndCollect(node.children, true);
      } else if (node.session.id === sessionId) {
        findAndCollect(node.children, true);
        return true;
      } else if (findAndCollect(node.children, false)) {
        return true;
      }
    }
    return false;
  };

  findAndCollect(tree);
  return descendants;
}
```

### Integration with useSessionGraph
```tsx
// hooks/useSessionGraph.ts (updated)
import { useMemo } from 'react';
import { buildSessionTree, treeToFlowElements, getTreeStats } from '@/lib/graph/tree-builder';
import { applyDagreLayout } from '@/lib/graph/layout';
import { useSessions } from './useSessions';
import { useSync } from '@/context/SyncProvider';

export function useSessionGraph() {
  const { sessions } = useSessions();
  const sync = useSync();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { nodes, edges, stats } = useMemo(() => {
    // Build tree structure
    const tree = buildSessionTree(sessions);
    
    // Convert to flow elements
    const { nodes, edges } = treeToFlowElements(
      tree,
      selectedSessionId,
      sync.data.session_status,
    );
    
    // Apply layout
    const layouted = applyDagreLayout(nodes, edges);
    
    // Calculate stats
    const stats = getTreeStats(tree);
    
    return { ...layouted, stats };
  }, [sessions, selectedSessionId, sync.data.session_status]);

  return { nodes, edges, stats, selectedSessionId, setSelectedSessionId };
}
```

## Dependencies
- 14-graph-reactflow-setup
- 12-connection-sse-sync

## Estimated Effort
0.5 days

## Notes
- Circular references shouldn't occur but we handle them defensively
- Tree stats can be displayed in a footer or debug panel
- Consider caching tree structure and only updating affected subtrees
- 2025-12-31: Added tree builder utilities with cycle detection, depth filtering, stats, and flow element conversion; wired incremental reuse into the session graph.
