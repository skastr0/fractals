# Part Rendering: Text, Tool, Reasoning, Patch

## Context
OpenCode messages have multiple part types: text, reasoning, tool, file, patch, agent, step-start/step-finish. Each needs its own renderer. This is the most complex rendering work item.

## Acceptance Criteria
- [x] TextPart - markdown rendering with syntax highlighting
- [x] ReasoningPart - collapsible thinking content
- [x] ToolPart - shows tool call with status (pending/running/completed/error)
- [x] FilePart - file attachment display
- [x] PatchPart - diff viewer with file changes
- [x] AgentPart - agent switching indicator
- [x] StepPart - step boundaries (collapse groups)
- [x] Streaming text updates (delta handling)
- [x] Proper loading states for each part type

## Technical Guidance

### Part Renderer Hub
```tsx
// components/session/part-renderer.tsx
import { memo } from 'react';
import type { Part } from '@/lib/opencode';
import { TextPartRenderer } from './parts/text-part';
import { ReasoningPartRenderer } from './parts/reasoning-part';
import { ToolPartRenderer } from './parts/tool-part';
import { FilePartRenderer } from './parts/file-part';
import { PatchPartRenderer } from './parts/patch-part';
import { AgentPartRenderer } from './parts/agent-part';
import { StepPartRenderer } from './parts/step-part';

interface PartRendererProps {
  part: Part;
}

export const PartRenderer = memo(function PartRenderer({ part }: PartRendererProps) {
  switch (part.type) {
    case 'text':
      return <TextPartRenderer part={part} />;
    case 'reasoning':
      return <ReasoningPartRenderer part={part} />;
    case 'tool':
      return <ToolPartRenderer part={part} />;
    case 'file':
      return <FilePartRenderer part={part} />;
    case 'patch':
      return <PatchPartRenderer part={part} />;
    case 'agent':
      return <AgentPartRenderer part={part} />;
    case 'step-start':
    case 'step-finish':
      return <StepPartRenderer part={part} />;
    default:
      return null;
  }
});
```

### Text Part Renderer
```tsx
// components/session/parts/text-part.tsx
import { memo } from 'react';
import { Markdown } from '@/components/ui/markdown';
import type { TextPart } from '@/lib/opencode';

interface TextPartRendererProps {
  part: TextPart;
}

export const TextPartRenderer = memo(function TextPartRenderer({ part }: TextPartRendererProps) {
  if (part.ignored) return null;
  
  return (
    <div className={part.synthetic ? 'text-muted-foreground italic' : ''}>
      <Markdown content={part.text} />
    </div>
  );
});
```

### Reasoning Part Renderer
```tsx
// components/session/parts/reasoning-part.tsx
import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import type { ReasoningPart } from '@/lib/opencode';

interface ReasoningPartRendererProps {
  part: ReasoningPart;
}

export const ReasoningPartRenderer = memo(function ReasoningPartRenderer({ part }: ReasoningPartRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-sm text-muted-foreground"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Brain className="h-4 w-4" />
        <span>Thinking</span>
        {part.time?.end && (
          <span className="ml-auto text-xs">
            {((part.time.end - part.time.start) / 1000).toFixed(1)}s
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div className="p-3 border-t border-border bg-background">
          <Markdown content={part.text} className="text-sm text-muted-foreground" />
        </div>
      )}
    </div>
  );
});
```

### Tool Part Renderer
```tsx
// components/session/parts/tool-part.tsx
import { memo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Check, X, Clock } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import type { ToolPart } from '@/lib/opencode';

interface ToolPartRendererProps {
  part: ToolPart;
}

export const ToolPartRenderer = memo(function ToolPartRenderer({ part }: ToolPartRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const state = part.state;

  const getStatusIcon = () => {
    switch (state.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'completed':
        return <Check className="h-4 w-4 text-success" />;
      case 'error':
        return <X className="h-4 w-4 text-error" />;
    }
  };

  const getTitle = () => {
    if (state.status === 'completed' || state.status === 'running') {
      return state.title ?? part.tool;
    }
    return part.tool;
  };

  const getDuration = () => {
    if ('time' in state && state.time.end) {
      return ((state.time.end - state.time.start) / 1000).toFixed(2) + 's';
    }
    return null;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 text-sm"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {getStatusIcon()}
        <span className="font-mono">{getTitle()}</span>
        {getDuration() && (
          <span className="ml-auto text-xs text-muted-foreground">{getDuration()}</span>
        )}
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-border bg-background space-y-3">
          {/* Input */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
            <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto">
              {JSON.stringify(state.input, null, 2)}
            </pre>
          </div>

          {/* Output (if completed) */}
          {state.status === 'completed' && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
              <div className="text-sm">
                <Markdown content={state.output} />
              </div>
            </div>
          )}

          {/* Error (if error) */}
          {state.status === 'error' && (
            <div className="text-sm text-error">
              {state.error}
            </div>
          )}

          {/* Attachments */}
          {state.status === 'completed' && state.attachments?.map((file) => (
            <div key={file.id} className="flex items-center gap-2 text-sm">
              <span>{file.filename ?? file.url}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
```

### Patch Part Renderer
```tsx
// components/session/parts/patch-part.tsx
import { memo } from 'react';
import { FileCode } from 'lucide-react';
import type { PatchPart } from '@/lib/opencode';

interface PatchPartRendererProps {
  part: PatchPart;
}

export const PatchPartRenderer = memo(function PatchPartRenderer({ part }: PatchPartRendererProps) {
  return (
    <div className="border border-border rounded-lg p-3 bg-muted/20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <FileCode className="h-4 w-4" />
        <span>Patch applied</span>
        <span className="font-mono">{part.hash.slice(0, 8)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {part.files.map((file) => (
          <span
            key={file}
            className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground font-mono"
          >
            {file}
          </span>
        ))}
      </div>
    </div>
  );
});
```

### Agent Part Renderer
```tsx
// components/session/parts/agent-part.tsx
import { memo } from 'react';
import { Bot } from 'lucide-react';
import type { AgentPart } from '@/lib/opencode';

interface AgentPartRendererProps {
  part: AgentPart;
}

export const AgentPartRenderer = memo(function AgentPartRenderer({ part }: AgentPartRendererProps) {
  return (
    <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-primary/10 text-primary">
      <Bot className="h-3 w-3" />
      <span>Switched to {part.name}</span>
    </div>
  );
});
```

### Markdown Component
```tsx
// components/ui/markdown.tsx
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface MarkdownProps {
  content: string;
  className?: string;
}

export const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  return (
    <ReactMarkdown
      className={`prose prose-invert prose-sm max-w-none ${className}`}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});
```

## Dependencies
- 18-session-message-list
- 05-ui-primitive-components

## Estimated Effort
2 days

## Notes
- React-markdown for safe markdown rendering
- Prism for syntax highlighting
- Tool parts can be quite complex - handle all states
- Consider lazy loading for large outputs
- [2026-01-01]: Implemented PartRenderer and part renderers with markdown, tool status, and attachments. Files: components/session/part-renderer.tsx, components/session/parts/*.tsx, components/ui/markdown.tsx
