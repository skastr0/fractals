# Keyboard Shortcuts

## Context
Implement keyboard shortcuts for power users. OpenCode has a comprehensive set of keybindings that we should support in the UI version. Focus on the most important actions first.

## Acceptance Criteria
- [x] Escape clears graph selection
- [x] Arrow keys move graph selection
- [ ] Global shortcut handler
- [ ] Cmd/Ctrl+K command palette
- [ ] Cmd/Ctrl+Enter to send message
- [ ] Escape to close panes/dialogs
- [ ] Arrow keys for message navigation
- [ ] Shortcut hints in UI (tooltips)
- [ ] Shortcut help dialog
- [ ] Customizable shortcuts (future)

## Technical Guidance

### Shortcut Registry
```tsx
// lib/shortcuts/registry.ts
export interface Shortcut {
  id: string;
  key: string;  // e.g., 'mod+k', 'escape', 'mod+shift+s'
  description: string;
  category: string;
  action: () => void;
  disabled?: boolean;
}

class ShortcutRegistry {
  private shortcuts = new Map<string, Shortcut>();
  private handlers = new Map<string, () => void>();

  register(shortcut: Shortcut) {
    this.shortcuts.set(shortcut.id, shortcut);
    this.handlers.set(normalizeKey(shortcut.key), shortcut.action);
  }

  unregister(id: string) {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      this.handlers.delete(normalizeKey(shortcut.key));
      this.shortcuts.delete(id);
    }
  }

  getAll(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    const key = getEventKey(event);
    const handler = this.handlers.get(key);
    
    if (handler) {
      event.preventDefault();
      handler();
      return true;
    }
    return false;
  }
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace('mod', isMac() ? 'meta' : 'ctrl')
    .split('+')
    .sort()
    .join('+');
}

function getEventKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('meta');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(event.key.toLowerCase());
  return parts.sort().join('+');
}

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
}

export const shortcutRegistry = new ShortcutRegistry();
```

### Shortcut Provider
```tsx
// context/ShortcutProvider.tsx
import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { shortcutRegistry, type Shortcut } from '@/lib/shortcuts/registry';

interface ShortcutContextValue {
  register: (shortcut: Omit<Shortcut, 'action'> & { action: () => void }) => void;
  unregister: (id: string) => void;
  getAll: () => Shortcut[];
  formatKey: (key: string) => string;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

export function ShortcutProvider({ children }: { children: ReactNode }) {
  // Global keyboard handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if in input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow certain shortcuts even in inputs
        if (!['mod+enter', 'escape'].includes(getEventKey(event))) {
          return;
        }
      }

      shortcutRegistry.handleKeyDown(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatKey = useCallback((key: string): string => {
    const isMac = /Mac/.test(navigator.platform);
    return key
      .replace('mod', isMac ? '⌘' : 'Ctrl')
      .replace('shift', isMac ? '⇧' : 'Shift')
      .replace('alt', isMac ? '⌥' : 'Alt')
      .replace('enter', '↵')
      .replace('escape', 'Esc')
      .replace('arrowup', '↑')
      .replace('arrowdown', '↓')
      .split('+')
      .join(isMac ? '' : '+');
  }, []);

  const value: ShortcutContextValue = {
    register: shortcutRegistry.register.bind(shortcutRegistry),
    unregister: shortcutRegistry.unregister.bind(shortcutRegistry),
    getAll: shortcutRegistry.getAll.bind(shortcutRegistry),
    formatKey,
  };

  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutContext);
  if (!context) throw new Error('useShortcuts must be used within ShortcutProvider');
  return context;
}
```

### useHotkey Hook
```tsx
// hooks/useHotkey.ts
import { useEffect } from 'react';
import { useShortcuts } from '@/context/ShortcutProvider';

export function useHotkey(
  id: string,
  key: string,
  action: () => void,
  options: { description?: string; category?: string; disabled?: boolean } = {}
) {
  const { register, unregister } = useShortcuts();

  useEffect(() => {
    if (options.disabled) return;

    register({
      id,
      key,
      description: options.description ?? '',
      category: options.category ?? 'General',
      action,
    });

    return () => unregister(id);
  }, [id, key, action, options.disabled, register, unregister]);
}
```

### Shortcut Help Dialog
```tsx
// components/dialogs/shortcut-help-dialog.tsx
import { useShortcuts } from '@/context/ShortcutProvider';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

export function ShortcutHelpDialog() {
  const { getAll, formatKey } = useShortcuts();
  const shortcuts = getAll();

  // Group by category
  const byCategory = shortcuts.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <DialogContent title="Keyboard Shortcuts">
      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{category}</h3>
            <div className="space-y-1">
              {items.map((shortcut) => (
                <div key={shortcut.id} className="flex items-center justify-between py-1">
                  <span className="text-sm">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                    {formatKey(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DialogContent>
  );
}
```

### Default Shortcuts Registration
```tsx
// hooks/useDefaultShortcuts.ts
import { useEffect } from 'react';
import { usePanes } from '@/context/PanesProvider';
import { useShortcuts } from '@/context/ShortcutProvider';
import { ConfigPane } from '@/components/panes/config-pane';

export function useDefaultShortcuts() {
  const panes$ = usePanes();
  const { register, unregister } = useShortcuts();

  useEffect(() => {
    // Core shortcuts
    register({
      id: 'close-pane',
      key: 'q',
      description: 'Close most recent pane',
      category: 'Navigation',
      action: () => panes$.closeMostRecentPane(),
    });

    register({
      id: 'open-config',
      key: 'mod+,',
      description: 'Open configuration',
      category: 'Navigation',
      action: () => panes$.openPane({ type: 'config', component: <ConfigPane /> }),
    });

    register({
      id: 'new-session',
      key: 'mod+n',
      description: 'New session',
      category: 'Session',
      action: () => {
        // Create new session
      },
    });

    return () => {
      unregister('close-pane');
      unregister('open-config');
      unregister('new-session');
    };
  }, [panes$, register, unregister]);
}
```

## Dependencies
- 04-foundation-core-providers
- 06-ui-dialog-menu

## Estimated Effort
1 day

## Notes
- Reference OpenCode's keybinds config for standard shortcuts
- Mac vs Windows key differences (Cmd vs Ctrl)
- Shortcuts should show in tooltips
- 2026-01-01: Added graph Escape + Arrow key selection movement; broader shortcut system deferred.
