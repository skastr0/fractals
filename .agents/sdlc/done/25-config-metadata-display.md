# Server and Project Metadata Display

## Context
Display rich metadata about the OpenCode server, current project, and runtime information. This helps users understand their environment and troubleshoot issues.

## Acceptance Criteria
- [x] Placeholder config components folder created for MVP
- [ ] Server information (version, URL, uptime)
- [ ] Project metadata (path, VCS, last modified)
- [ ] Available providers and models
- [ ] MCP server statuses
- [ ] LSP server statuses
- [ ] Active sessions count
- [ ] Resource paths (config, state directories)

## Technical Guidance

### Metadata Pane
```tsx
// components/panes/metadata-pane.tsx
import { useState, useEffect } from 'react';
import { useOpenCode } from '@/context/OpenCodeProvider';
import { useProject } from '@/context/ProjectProvider';
import { useSync } from '@/context/SyncProvider';
import { ConfigSection, ConfigItem } from './config-section';
import { Button } from '@/components/ui/button';
import { RefreshCw, Server, FolderOpen, Plug, Code, Activity } from 'lucide-react';
import type { Provider, McpStatus, LspStatus, Path } from '@/lib/opencode';

export function MetadataPane() {
  const { client, health } = useOpenCode();
  const { currentProject } = useProject();
  const sync = useSync();
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [mcpStatus, setMcpStatus] = useState<Record<string, McpStatus>>({});
  const [lspStatus, setLspStatus] = useState<LspStatus[]>([]);
  const [paths, setPaths] = useState<Path | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetadata = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const [providersResult, mcpResult, lspResult, pathResult] = await Promise.all([
        client.provider.list(),
        client.mcp.status(),
        client.lsp.status(),
        client.path.get(),
      ]);
      setProviders(providersResult.data);
      setMcpStatus(mcpResult.data);
      setLspStatus(lspResult.data);
      setPaths(pathResult.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, [client]);

  const sessionCount = Object.keys(sync.data.sessions).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm font-medium">System Information</span>
        <Button variant="ghost" size="icon" onPress={loadMetadata}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Server Info */}
        <ConfigSection title="Server" icon={<Server className="h-4 w-4" />} defaultOpen>
          <ConfigItem label="URL" value={health?.url ?? 'Unknown'} />
          <ConfigItem 
            label="Status" 
            value={health?.connected ? 'Connected' : 'Disconnected'}
            valueColor={health?.connected ? 'text-success' : 'text-error'}
          />
          <ConfigItem label="Active Sessions" value={String(sessionCount)} />
        </ConfigSection>

        {/* Project Info */}
        {currentProject && (
          <ConfigSection title="Project" icon={<FolderOpen className="h-4 w-4" />} defaultOpen>
            <ConfigItem label="Name" value={currentProject.name ?? 'Unnamed'} />
            <ConfigItem label="Path" value={currentProject.worktree} />
            {currentProject.vcs && <ConfigItem label="VCS" value={currentProject.vcs} />}
            <ConfigItem 
              label="Last Modified" 
              value={new Date(currentProject.time.updated).toLocaleString()} 
            />
          </ConfigSection>
        )}

        {/* Paths */}
        {paths && (
          <ConfigSection title="Paths">
            <ConfigItem label="Home" value={paths.home} />
            <ConfigItem label="Config" value={paths.config} />
            <ConfigItem label="State" value={paths.state} />
            <ConfigItem label="Worktree" value={paths.worktree} />
          </ConfigSection>
        )}

        {/* Providers */}
        <ConfigSection title="Providers" icon={<Activity className="h-4 w-4" />}>
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No providers configured</p>
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between py-1">
                <span className="text-sm">{provider.name}</span>
                <span className="text-xs text-muted-foreground">
                  {Object.keys(provider.models).length} models
                </span>
              </div>
            ))
          )}
        </ConfigSection>

        {/* MCP Servers */}
        <ConfigSection title="MCP Servers" icon={<Plug className="h-4 w-4" />}>
          {Object.entries(mcpStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No MCP servers configured</p>
          ) : (
            Object.entries(mcpStatus).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between py-1">
                <span className="text-sm">{name}</span>
                <McpStatusBadge status={status} />
              </div>
            ))
          )}
        </ConfigSection>

        {/* LSP Servers */}
        <ConfigSection title="Language Servers" icon={<Code className="h-4 w-4" />}>
          {lspStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No language servers active</p>
          ) : (
            lspStatus.map((lsp) => (
              <div key={lsp.id} className="flex items-center justify-between py-1">
                <span className="text-sm">{lsp.name}</span>
                <span className={`text-xs ${lsp.status === 'connected' ? 'text-success' : 'text-error'}`}>
                  {lsp.status}
                </span>
              </div>
            ))
          )}
        </ConfigSection>
      </div>
    </div>
  );
}

function McpStatusBadge({ status }: { status: McpStatus }) {
  const statusConfig = {
    connected: { label: 'Connected', color: 'text-success' },
    disabled: { label: 'Disabled', color: 'text-muted-foreground' },
    failed: { label: 'Failed', color: 'text-error' },
    needs_auth: { label: 'Needs Auth', color: 'text-warning' },
    needs_client_registration: { label: 'Needs Setup', color: 'text-warning' },
  };

  const config = statusConfig[status.status];

  return (
    <span className={`text-xs ${config.color}`}>
      {config.label}
    </span>
  );
}
```

### Enhanced ConfigSection with Icon
```tsx
// components/panes/config-section.tsx (enhanced)
interface ConfigSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ConfigSection({ title, icon, defaultOpen = false, children }: ConfigSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 text-sm font-medium"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {icon}
        {title}
      </button>
      {isOpen && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );
}

interface ConfigItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

export function ConfigItem({ label, value, valueColor }: ConfigItemProps) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${valueColor ?? 'text-foreground'} truncate max-w-[200px]`} title={value}>
        {value}
      </span>
    </div>
  );
}
```

## Dependencies
- 23-config-json-viewer
- 03-foundation-opencode-sdk

## Estimated Effort
1 day

## Notes
- MCP/LSP status helps debug tool issues
- Path display helps users find config files
- Consider adding a "copy path" feature
- 2026-01-01: Placeholder config folder created; metadata pane deferred for MVP.
