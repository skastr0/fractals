# ReactFlow Setup for Session Graph

## Context
Set up ReactFlow to visualize sessions as nodes in a tree structure. This is the core visualization component, adapted from Telechy's message tree to show sessions (including subagent sessions) instead.

## Acceptance Criteria
- [x] ReactFlow configured with custom session node
- [x] ELK layout engine integrated for tree arrangement
- [x] Edge styling matches OpenCode theme
- [x] Pan and zoom controls working
- [x] Node click selects sessions
- [x] Fit view on initial load
- [x] Layout avoids recompute on selection/status changes

## Technical Guidance

### ReactFlow Setup
```tsx
// components/graph/session-graph.tsx
'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useStoreApi,
  type Node,
  type Edge,
  PanOnScrollMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SessionNode, type SessionNodeData } from './session-node';
import { useSessionGraph } from '@/hooks/useSessionGraph';
import { usePanes } from '@/context/PanesProvider';
import { SessionPane } from '@/components/panes/session-pane';

const nodeTypes = {
  sessionNode: SessionNode,
};

export function SessionGraph() {
  const { nodes, edges, selectedSessionId, onNodeClick, clearSelection } = useSessionGraph();
  const panes$ = usePanes();
  const reactFlowInstance = useReactFlow();

  // Handle node click - open session in pane
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node<SessionNodeData>) => {
    const wasSelected = selectedSessionId === node.id;
    
    onNodeClick(node.id);
    
    if (!wasSelected) {
      // Open session pane
      panes$.openPane({
        type: 'session',
        component: <SessionPane sessionId={node.id} />,
        title: node.data.title || 'Session',
      });
    } else {
      // Deselect and close pane
      clearSelection();
      panes$.closePane('session');
    }
  }, [selectedSessionId, onNodeClick, clearSelection, panes$]);

  // Fit view on initial load
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length === 0]); // Only on first render with nodes

  return (
    <div className="h-full w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={true}
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={0.8}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border))" gap={20} size={1} />
        <Controls className="!bg-background !border-border" />
        <MiniMap
          className="!bg-background/80"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
```

### Graph Hook
```tsx
// hooks/useSessionGraph.ts
import { useCallback, useMemo, useState } from 'react';
import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import { useSessions } from './useSessions';
import { useSync } from '@/context/SyncProvider';
import type { Session } from '@/lib/opencode';

export interface SessionNodeData {
  sessionId: string;
  title: string;
  status: 'idle' | 'busy' | 'retry' | 'pending_permission';
  depth: number;
  isSubagent: boolean;
  isSelected: boolean;
  updatedAt: number;
}

// Layout configuration
const LAYOUT_CONFIG = {
  rankdir: 'TB' as const,
  nodesep: 100,
  ranksep: 150,
  nodeWidth: 280,
  nodeHeight: 100,
};

function getLayoutedElements(
  nodes: Node<SessionNodeData>[],
  edges: Edge[],
): { nodes: Node<SessionNodeData>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: LAYOUT_CONFIG.rankdir,
    nodesep: LAYOUT_CONFIG.nodesep,
    ranksep: LAYOUT_CONFIG.ranksep,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: LAYOUT_CONFIG.nodeWidth,
      height: LAYOUT_CONFIG.nodeHeight,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: { x: pos.x - LAYOUT_CONFIG.nodeWidth / 2, y: pos.y },
      };
    }),
    edges,
  };
}

export function useSessionGraph() {
  const { rootSessions, getSubagentSessions } = useSessions();
  const sync = useSync();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node<SessionNodeData>[] = [];
    const edges: Edge[] = [];

    // Recursive function to add sessions and their children
    const addSession = (session: Session, parentId?: string) => {
      const status = sync.data.session_status[session.id] ?? { type: 'idle' };

      nodes.push({
        id: session.id,
        type: 'sessionNode',
        position: { x: 0, y: 0 }, // Will be calculated by Dagre
        data: {
          sessionId: session.id,
          title: session.title,
          status: status.type,
          depth: session.depth ?? 0,
          isSubagent: !!session.parentID,
          isSelected: session.id === selectedSessionId,
          updatedAt: session.time.updated,
        },
      });

      if (parentId) {
        edges.push({
          id: `${parentId}-${session.id}`,
          source: parentId,
          target: session.id,
          type: 'smoothstep',
          animated: status.type === 'busy',
          style: {
            stroke: session.id === selectedSessionId 
              ? 'hsl(var(--primary))' 
              : 'hsl(var(--border))',
            strokeWidth: session.id === selectedSessionId ? 2 : 1,
          },
        });
      }

      // Add child sessions (subagents)
      const children = getSubagentSessions(session.id);
      children.forEach((child) => addSession(child, session.id));
    };

    // Start with root sessions
    rootSessions.forEach((session) => addSession(session));

    // Apply layout
    return getLayoutedElements(nodes, edges);
  }, [rootSessions, getSubagentSessions, sync.data.session_status, selectedSessionId]);

  const onNodeClick = useCallback((sessionId: string) => {
    setSelectedSessionId((prev) => (prev === sessionId ? null : sessionId));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSessionId(null);
  }, []);

  return {
    nodes,
    edges,
    selectedSessionId,
    onNodeClick,
    clearSelection,
  };
}
```

### Wrapper with ReactFlowProvider
```tsx
// app/page.tsx or wherever graph is used
import { ReactFlowProvider } from '@xyflow/react';
import { SessionGraph } from '@/components/graph/session-graph';

export default function HomePage() {
  return (
    <ReactFlowProvider>
      <SessionGraph />
    </ReactFlowProvider>
  );
}
```

## Dependencies
- 04-foundation-core-providers
- 12-connection-sse-sync
- 13-connection-session-crud

## Estimated Effort
1 day

## Notes
- Reference Telechy's useExplorer.tsx for Dagre patterns
- Keep node count reasonable - consider pagination
- Edge animation indicates active sessions
- [2025-12-31]: Implemented ReactFlow graph with ELK layout, selection handling, and fitView; added session pane launch on click.
