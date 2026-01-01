# Server Connection Management

## Context
Manage the connection to the OpenCode server. This includes detecting a running server, handling connection failures, and providing UI for server selection when multiple servers are available or when the default isn't accessible.

## Acceptance Criteria
- [x] Auto-detect local OpenCode server on startup
- [x] Display connection status in UI
- [x] Handle server not running gracefully
- [x] Server URL configuration in settings
- [x] Reconnection logic on disconnect
- [x] Multiple server support (for multiple projects)
- [x] Connection timeout handling
- [x] Server version compatibility check

## Technical Guidance

### Server Detection Hook
```tsx
// hooks/useServerConnection.ts
import { useState, useEffect, useCallback } from 'react';
import { checkServerHealth, type ServerHealth } from '@/lib/opencode';

const DEFAULT_URLS = [
  'http://localhost:5577',
  'http://localhost:5578',
];

export interface ServerConnection {
  url: string;
  health: ServerHealth | null;
  isConnecting: boolean;
  error: string | null;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  scanForServers: () => Promise<string[]>;
}

export function useServerConnection(): ServerConnection {
  const [url, setUrl] = useState<string>('');
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (targetUrl?: string) => {
    setIsConnecting(true);
    setError(null);
    
    const urlToTry = targetUrl ?? url ?? DEFAULT_URLS[0];
    
    try {
      const result = await checkServerHealth(urlToTry);
      setHealth(result);
      setUrl(urlToTry);
      
      if (!result.connected) {
        setError(result.error ?? 'Unable to connect to server');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      setHealth({ connected: false, url: urlToTry });
    } finally {
      setIsConnecting(false);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    setHealth(null);
    setError(null);
  }, []);

  const scanForServers = useCallback(async (): Promise<string[]> => {
    const found: string[] = [];
    
    await Promise.all(
      DEFAULT_URLS.map(async (serverUrl) => {
        const result = await checkServerHealth(serverUrl);
        if (result.connected) {
          found.push(serverUrl);
        }
      })
    );
    
    return found;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect(DEFAULT_URLS[0]);
  }, []);

  // Periodic health check
  useEffect(() => {
    if (!health?.connected) return;
    
    const interval = setInterval(() => {
      checkServerHealth(url).then(setHealth);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [url, health?.connected]);

  return {
    url,
    health,
    isConnecting,
    error,
    connect,
    disconnect,
    scanForServers,
  };
}
```

### Server Selection Dialog
```tsx
// components/dialogs/server-select-dialog.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useServerConnection } from '@/hooks/useServerConnection';
import { Loader2, Server, Check, X } from 'lucide-react';

interface ServerSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function ServerSelectDialog({ isOpen, onClose, onSelect }: ServerSelectDialogProps) {
  const { scanForServers, connect, isConnecting } = useServerConnection();
  const [servers, setServers] = useState<string[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScanning(true);
      scanForServers().then((found) => {
        setServers(found);
        setScanning(false);
      });
    }
  }, [isOpen, scanForServers]);

  const handleSelect = async (url: string) => {
    await connect(url);
    onSelect(url);
    onClose();
  };

  return (
    <DialogContent title="Select OpenCode Server">
      <div className="space-y-4">
        {/* Discovered Servers */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Available Servers</h3>
          {scanning ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning for servers...
            </div>
          ) : servers.length > 0 ? (
            <div className="space-y-1">
              {servers.map((serverUrl) => (
                <Button
                  key={serverUrl}
                  variant="outline"
                  className="w-full justify-start"
                  onPress={() => handleSelect(serverUrl)}
                >
                  <Server className="h-4 w-4 mr-2" />
                  {serverUrl}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No servers found. Make sure OpenCode is running.
            </p>
          )}
        </div>

        {/* Custom URL */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Custom Server URL</h3>
          <div className="flex gap-2">
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="http://localhost:5577"
            />
            <Button
              onPress={() => handleSelect(customUrl)}
              isDisabled={!customUrl || isConnecting}
            >
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
```

### Connection Status Component
```tsx
// components/connection-status.tsx
import { useOpenCode } from '@/context/OpenCodeProvider';
import { Button } from '@/components/ui/button';
import { Server, RefreshCw, AlertCircle } from 'lucide-react';

export function ConnectionStatus() {
  const { health, isConnecting, connect } = useOpenCode();

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Connecting...
      </div>
    );
  }

  if (!health?.connected) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-error" />
        <span className="text-sm text-error">Disconnected</span>
        <Button size="sm" variant="ghost" onPress={() => connect()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-success">
      <Server className="h-4 w-4" />
      <span className="text-sm">Connected to {health.url}</span>
    </div>
  );
}
```

## Dependencies
- 03-foundation-opencode-sdk
- 04-foundation-core-providers
- 06-ui-dialog-menu

## Estimated Effort
1 day

## Notes
- Consider mDNS discovery if OpenCode server supports it
- Store last successful URL in localStorage
- Handle graceful degradation when server is unavailable
- 2025-12-31: Added useServerConnection hook with auto-detect, health checks, reconnection, and server settings dialog; wired into status bar.
