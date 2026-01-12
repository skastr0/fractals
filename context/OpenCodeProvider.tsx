'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { InitModal, readInitAcknowledged } from '@/components/init-modal'
import { type ServerCompatibility, useServerConnection } from '@/hooks/useServerConnection'
import { createClient, type OpencodeClient, type ServerHealth } from '@/lib/opencode'

export interface OpenCodeContextValue {
  client: OpencodeClient | null
  health: ServerHealth | null
  isConnecting: boolean
  isReconnecting: boolean
  error: string | null
  url: string
  knownServers: string[]
  compatibility: ServerCompatibility
  connect: (url?: string) => Promise<ServerHealth | null>
  disconnect: () => void
  scanForServers: () => Promise<string[]>
}

const OpenCodeContext = createContext<OpenCodeContextValue | null>(null)

export function OpenCodeProvider({ children }: { children: ReactNode }) {
  const [isAcknowledged, setIsAcknowledged] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    const acknowledged = readInitAcknowledged()
    setIsAcknowledged(acknowledged)
    setShowModal(!acknowledged)
  }, [])

  const {
    url,
    health,
    isConnecting,
    isReconnecting,
    error,
    knownServers,
    compatibility,
    connect,
    disconnect,
    scanForServers,
  } = useServerConnection({ autoConnect: isAcknowledged === true })

  const handleInitConfirm = useCallback(() => {
    setIsAcknowledged(true)
    setShowModal(false)
    // Trigger connection after acknowledgment
    void connect()
  }, [connect])

  const client = useMemo(() => {
    if (!health?.connected) {
      return null
    }

    const baseUrl = health.url || url
    return createClient({ baseUrl })
  }, [health?.connected, health?.url, url])

  const value = useMemo(
    () => ({
      client,
      health,
      isConnecting,
      isReconnecting,
      error,
      url,
      knownServers,
      compatibility,
      connect,
      disconnect,
      scanForServers,
    }),
    [
      client,
      health,
      isConnecting,
      isReconnecting,
      error,
      url,
      knownServers,
      compatibility,
      connect,
      disconnect,
      scanForServers,
    ],
  )

  return (
    <OpenCodeContext.Provider value={value}>
      {children}
      <InitModal isOpen={showModal} onConfirm={handleInitConfirm} />
    </OpenCodeContext.Provider>
  )
}

export function useOpenCode(): OpenCodeContextValue {
  const context = useContext(OpenCodeContext)
  if (!context) {
    throw new Error('useOpenCode must be used within OpenCodeProvider')
  }
  return context
}
