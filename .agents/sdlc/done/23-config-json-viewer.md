# opencode.json Configuration Viewer

## Context
Display the opencode.json configuration files (global and project-specific) in a readable format. Users should be able to see their current configuration including providers, models, agents, MCP servers, and other settings.

## Acceptance Criteria
- [x] Placeholder config components folder created for MVP
- [ ] Display global config (~/.config/opencode/opencode.json)
- [ ] Display project config (.opencode/opencode.json)
- [ ] Visual distinction between global and project settings
- [ ] Collapsible sections for each config category
- [ ] Merged view showing effective configuration
- [ ] Raw JSON view toggle
- [ ] Config path display
- [ ] Refresh button to reload config

## Technical Guidance

### Config Viewer Pane
```tsx
// components/panes/config-pane.tsx
import { useState, useEffect } from 'react';
import { useOpenCode } from '@/context/OpenCodeProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfigSection } from './config-section';
import { RefreshCw, Code, Layers } from 'lucide-react';
import type { Config } from '@/lib/opencode';

export function ConfigPane() {
  const { client } = useOpenCode();
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');

  const loadConfig = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const result = await client.config.get();
      setConfig(result.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [client]);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="p-4 text-error">Failed to load configuration</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm font-medium">Configuration</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setViewMode(viewMode === 'visual' ? 'raw' : 'visual')}
          >
            {viewMode === 'visual' ? <Code className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onPress={loadConfig}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'raw' ? (
          <RawConfigView config={config} />
        ) : (
          <VisualConfigView config={config} />
        )}
      </div>
    </div>
  );
}

function VisualConfigView({ config }: { config: Config }) {
  return (
    <div className="space-y-4">
      {/* General Settings */}
      <ConfigSection title="General" defaultOpen>
        <ConfigItem label="Theme" value={config.theme ?? 'default'} />
        <ConfigItem label="Model" value={config.model ?? 'Not set'} />
        <ConfigItem label="Default Agent" value={config.default_agent ?? 'build'} />
        <ConfigItem label="Share" value={config.share ?? 'manual'} />
        <ConfigItem label="Auto Update" value={String(config.autoupdate ?? true)} />
      </ConfigSection>

      {/* Providers */}
      {config.provider && Object.keys(config.provider).length > 0 && (
        <ConfigSection title="Providers">
          {Object.entries(config.provider).map(([name, provider]) => (
            <div key={name} className="pl-2 border-l-2 border-secondary mb-2">
              <span className="font-medium">{name}</span>
              {provider.api && (
                <ConfigItem label="API" value={provider.api} />
              )}
              {provider.models && (
                <ConfigItem label="Models" value={Object.keys(provider.models).length + ' configured'} />
              )}
            </div>
          ))}
        </ConfigSection>
      )}

      {/* Agents */}
      {config.agent && Object.keys(config.agent).length > 0 && (
        <ConfigSection title="Agents">
          {Object.entries(config.agent).map(([name, agent]) => (
            <div key={name} className="pl-2 border-l-2 border-secondary mb-2">
              <span className="font-medium">{name}</span>
              {agent?.model && <ConfigItem label="Model" value={agent.model} />}
              {agent?.mode && <ConfigItem label="Mode" value={agent.mode} />}
            </div>
          ))}
        </ConfigSection>
      )}

      {/* MCP Servers */}
      {config.mcp && Object.keys(config.mcp).length > 0 && (
        <ConfigSection title="MCP Servers">
          {Object.entries(config.mcp).map(([name, mcp]) => (
            <div key={name} className="pl-2 border-l-2 border-secondary mb-2">
              <span className="font-medium">{name}</span>
              <ConfigItem label="Type" value={mcp.type} />
              <ConfigItem label="Enabled" value={String(mcp.enabled ?? true)} />
            </div>
          ))}
        </ConfigSection>
      )}

      {/* Commands */}
      {config.command && Object.keys(config.command).length > 0 && (
        <ConfigSection title="Commands">
          {Object.entries(config.command).map(([name, cmd]) => (
            <ConfigItem key={name} label={'/' + name} value={cmd.description ?? 'No description'} />
          ))}
        </ConfigSection>
      )}
    </div>
  );
}

function RawConfigView({ config }: { config: Config }) {
  return (
    <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-x-auto">
      {JSON.stringify(config, null, 2)}
    </pre>
  );
}
```

### Config Section Component
```tsx
// components/panes/config-section.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ConfigSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ConfigSection({ title, defaultOpen = false, children }: ConfigSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 text-sm font-medium"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {title}
      </button>
      {isOpen && (
        <div className="p-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

interface ConfigItemProps {
  label: string;
  value: string;
}

export function ConfigItem({ label, value }: ConfigItemProps) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
```

### useConfig Hook
```tsx
// hooks/useConfig.ts
import { useState, useEffect, useCallback } from 'react';
import { useOpenCode } from '@/context/OpenCodeProvider';
import type { Config, Path } from '@/lib/opencode';

export function useConfig() {
  const { client } = useOpenCode();
  const [config, setConfig] = useState<Config | null>(null);
  const [paths, setPaths] = useState<Path | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    try {
      const [configResult, pathResult] = await Promise.all([
        client.config.get(),
        client.path.get(),
      ]);
      setConfig(configResult.data);
      setPaths(pathResult.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { config, paths, isLoading, error, refresh };
}
```

## Dependencies
- 03-foundation-opencode-sdk
- 07-ui-pane-system

## Estimated Effort
1 day

## Notes
- Config types are comprehensive in the SDK
- Show file paths for troubleshooting
- Consider JSON schema validation display
- 2026-01-01: Created components/config placeholder; full viewer deferred for MVP.
