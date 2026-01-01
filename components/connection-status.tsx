'use client'

import { Circle, RefreshCw, Server, Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useOpenCode } from '@/context/OpenCodeProvider'
import { DEFAULT_SERVER_URL } from '@/lib/opencode'
import { cn } from '@/lib/utils'

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

const normalizeUrl = (value: string): string => value.trim().replace(/\/$/, '')

export function ConnectionStatus() {
  const {
    health,
    isConnecting,
    isReconnecting,
    error,
    url,
    knownServers,
    compatibility,
    connect,
    scanForServers,
  } = useOpenCode()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [availableServers, setAvailableServers] = useState<string[]>([])
  const [customUrl, setCustomUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  const isConnected = Boolean(health?.connected)
  const statusLabel = isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'
  const statusColor = isConnecting ? 'text-warning' : isConnected ? 'text-success' : 'text-error'
  const detail = isConnected
    ? `Server ${health?.version ?? 'unknown'}`
    : error
      ? 'Server unavailable'
      : 'OpenCode Tree UI'

  const compatibilityLabel =
    compatibility === 'incompatible'
      ? 'Unsupported server version'
      : compatibility === 'unknown'
        ? 'Version unknown'
        : null

  const currentUrl = health?.url || url

  const serverOptions = useMemo(
    () => unique([...availableServers, ...knownServers]).filter(Boolean),
    [availableServers, knownServers],
  )

  useEffect(() => {
    if (!isDialogOpen) {
      return
    }

    setCustomUrl(currentUrl ?? '')
  }, [currentUrl, isDialogOpen])

  useEffect(() => {
    if (!isDialogOpen) {
      return
    }

    let isActive = true
    setIsScanning(true)

    scanForServers()
      .then((found) => {
        if (!isActive) {
          return
        }
        setAvailableServers(found)
      })
      .finally(() => {
        if (isActive) {
          setIsScanning(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isDialogOpen, scanForServers])

  const handleConnect = async (targetUrl: string) => {
    const nextUrl = targetUrl.trim()
    if (!nextUrl) {
      return
    }

    const result = await connect(nextUrl)
    if (result?.connected) {
      setIsDialogOpen(false)
    }
  }

  const handleRescan = async () => {
    setIsScanning(true)
    const found = await scanForServers()
    setAvailableServers(found)
    setIsScanning(false)
  }

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Circle className={cn('h-2 w-2', statusColor)} fill="currentColor" />
        <span className="text-xs text-muted-foreground">{statusLabel}</span>
        {isReconnecting ? (
          <span className="text-[10px] text-muted-foreground">Reconnecting</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{detail}</span>
        {compatibilityLabel ? <span className="text-warning">{compatibilityLabel}</span> : null}
        <Dialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button variant="ghost" size="sm" aria-label="Server settings">
            <Settings className="h-4 w-4" />
            Server
          </Button>
          <DialogContent
            title="Server connection"
            description="Choose or configure an OpenCode server."
          >
            <DialogBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Available servers</span>
                  <Button variant="ghost" size="sm" onPress={handleRescan} isDisabled={isScanning}>
                    {isScanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Rescan'}
                  </Button>
                </div>

                {serverOptions.length > 0 ? (
                  <div className="space-y-2">
                    {serverOptions.map((serverUrl) => {
                      const isActive =
                        normalizeUrl(serverUrl) === normalizeUrl(currentUrl ?? DEFAULT_SERVER_URL)

                      return (
                        <Button
                          key={serverUrl}
                          variant={isActive ? 'secondary' : 'outline'}
                          size="sm"
                          className="w-full justify-start"
                          onPress={() => handleConnect(serverUrl)}
                        >
                          <Server className="h-4 w-4" />
                          <span>{serverUrl}</span>
                        </Button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No servers found on the network.</p>
                )}

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Custom server URL</span>
                  <Input
                    value={customUrl}
                    onChange={setCustomUrl}
                    placeholder="http://localhost:5577"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => handleConnect(customUrl)}
                    isDisabled={isConnecting || customUrl.trim().length === 0}
                  >
                    {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Connect'}
                  </Button>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" size="sm" onPress={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
