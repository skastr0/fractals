# opencode.json Configuration Editor

## Context
Allow users to edit their opencode.json configuration. This is a more advanced feature that enables in-app configuration changes. Start with read-only in Phase 1, add editing in a future iteration.

## Acceptance Criteria
- [x] Placeholder config components folder created for MVP
- [ ] Form-based editor for common settings
- [ ] Theme selector dropdown
- [ ] Model selector with provider grouping
- [ ] Agent configuration toggles
- [ ] MCP server enable/disable
- [ ] Save changes to config file
- [ ] Validation before save
- [ ] Undo changes button
- [ ] Success/error feedback

## Technical Guidance

### Config Editor Component
```tsx
// components/panes/config-editor.tsx
import { useState, useCallback } from 'react';
import { useConfig } from '@/hooks/useConfig';
import { useOpenCode } from '@/context/OpenCodeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConfigSection } from './config-section';
import { Save, Undo, AlertCircle } from 'lucide-react';
import type { Config } from '@/lib/opencode';

export function ConfigEditor() {
  const { client } = useOpenCode();
  const { config: originalConfig, refresh, isLoading } = useConfig();
  const [editedConfig, setEditedConfig] = useState<Partial<Config>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = Object.keys(editedConfig).length > 0;

  const updateField = useCallback(<K extends keyof Config>(key: K, value: Config[K]) => {
    setEditedConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleSave = async () => {
    if (!client || !hasChanges) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await client.config.update({ ...editedConfig });
      setEditedConfig({});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedConfig({});
  };

  if (isLoading || !originalConfig) {
    return <div className="p-4 text-muted-foreground">Loading...</div>;
  }

  const mergedConfig = { ...originalConfig, ...editedConfig };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm font-medium">Edit Configuration</span>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="ghost" size="sm" onPress={handleReset}>
              <Undo className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onPress={handleSave}
            isDisabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/50 rounded-lg flex items-center gap-2 text-sm text-error">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* General Settings */}
        <ConfigSection title="General Settings" defaultOpen>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Theme</label>
              <Select
                selectedKey={mergedConfig.theme ?? 'default'}
                onSelectionChange={(key) => updateField('theme', key as string)}
              >
                <SelectItem key="default">Default</SelectItem>
                <SelectItem key="dark">Dark</SelectItem>
                <SelectItem key="light">Light</SelectItem>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Default Model</label>
              <Input
                value={mergedConfig.model ?? ''}
                onChange={(e) => updateField('model', e.target.value || undefined)}
                placeholder="provider/model-name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: provider/model (e.g., anthropic/claude-3-sonnet)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Default Agent</label>
              <Select
                selectedKey={mergedConfig.default_agent ?? 'build'}
                onSelectionChange={(key) => updateField('default_agent', key as string)}
              >
                <SelectItem key="build">Build</SelectItem>
                <SelectItem key="plan">Plan</SelectItem>
                <SelectItem key="general">General</SelectItem>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Auto Update</label>
                <p className="text-xs text-muted-foreground">
                  Automatically update to the latest version
                </p>
              </div>
              <Switch
                isSelected={mergedConfig.autoupdate !== false}
                onChange={(checked) => updateField('autoupdate', checked)}
              />
            </div>
          </div>
        </ConfigSection>

        {/* Sharing Settings */}
        <ConfigSection title="Sharing">
          <div>
            <label className="text-sm font-medium">Share Mode</label>
            <Select
              selectedKey={mergedConfig.share ?? 'manual'}
              onSelectionChange={(key) => updateField('share', key as 'manual' | 'auto' | 'disabled')}
            >
              <SelectItem key="manual">Manual (share via command)</SelectItem>
              <SelectItem key="auto">Auto (share new sessions)</SelectItem>
              <SelectItem key="disabled">Disabled (no sharing)</SelectItem>
            </Select>
          </div>
        </ConfigSection>

        {/* Log Level */}
        <ConfigSection title="Developer">
          <div>
            <label className="text-sm font-medium">Log Level</label>
            <Select
              selectedKey={mergedConfig.logLevel ?? 'INFO'}
              onSelectionChange={(key) => updateField('logLevel', key as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR')}
            >
              <SelectItem key="DEBUG">Debug</SelectItem>
              <SelectItem key="INFO">Info</SelectItem>
              <SelectItem key="WARN">Warning</SelectItem>
              <SelectItem key="ERROR">Error</SelectItem>
            </Select>
          </div>
        </ConfigSection>
      </div>
    </div>
  );
}
```

### Switch Component (if not already created)
```tsx
// components/ui/switch.tsx
import { Switch as AriaSwitch, type SwitchProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';

const switchVariants = tv({
  slots: {
    root: 'group inline-flex items-center cursor-pointer',
    track: [
      'w-10 h-6 rounded-full transition-colors',
      'bg-muted group-data-[selected]:bg-primary',
    ],
    thumb: [
      'w-5 h-5 rounded-full bg-white shadow transition-transform',
      'translate-x-0.5 group-data-[selected]:translate-x-[18px]',
    ],
  },
});

interface CustomSwitchProps extends Omit<SwitchProps, 'children'> {
  children?: React.ReactNode;
}

export function Switch({ children, ...props }: CustomSwitchProps) {
  const styles = switchVariants();
  
  return (
    <AriaSwitch {...props} className={styles.root()}>
      <div className={styles.track()}>
        <div className={styles.thumb()} />
      </div>
      {children && <span className="ml-2 text-sm">{children}</span>}
    </AriaSwitch>
  );
}
```

## Dependencies
- 23-config-json-viewer
- 05-ui-primitive-components

## Estimated Effort
1.5 days

## Notes
- Consider JSON schema validation
- Changes should take effect immediately where possible
- Some changes may require OpenCode restart
- 2026-01-01: Placeholder config folder created; editor UI deferred for MVP.
