'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { checkServerHealth, DEFAULT_SERVER_URL, type ServerHealth } from '@/lib/opencode'

const DEFAULT_SERVER_URLS = [
  DEFAULT_SERVER_URL, // SDK default (4096)
  'http://localhost:5577', // Legacy default
  'http://localhost:5578',
]
const STORAGE_KEYS = {
  lastUrl: 'opencode-server-url',
  knownServers: 'opencode-known-servers',
}

const HEALTH_CHECK_INTERVAL_MS = 30000
const CONNECTION_TIMEOUT_MS = 4000
const RECONNECT_DELAY_MS = 5000
const MIN_SERVER_VERSION = '0.0.0'

export type ServerCompatibility = 'compatible' | 'incompatible' | 'unknown'

export interface ServerConnection {
  url: string
  health: ServerHealth | null
  isConnecting: boolean
  isReconnecting: boolean
  error: string | null
  knownServers: string[]
  compatibility: ServerCompatibility
  connect: (url?: string) => Promise<ServerHealth | null>
  disconnect: () => void
  scanForServers: () => Promise<string[]>
}

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `http://${trimmed}`
}

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

const parseVersion = (value: string): number[] | null => {
  const normalized = value.trim().replace(/^v/i, '')
  const match = normalized.match(/\d+(?:\.\d+){0,2}/)
  if (!match) {
    return null
  }

  const parts = match[0].split('.').map((entry) => Number.parseInt(entry, 10))
  if (parts.some((part) => Number.isNaN(part))) {
    return null
  }

  while (parts.length < 3) {
    parts.push(0)
  }

  return parts.slice(0, 3)
}

const compareVersions = (left: string, right: string): number => {
  const leftParts = parseVersion(left)
  const rightParts = parseVersion(right)

  if (!leftParts || !rightParts) {
    return 0
  }

  for (let index = 0; index < 3; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

const readStoredValue = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStoredValue = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

const readStoredServers = (): string[] => {
  const raw = readStoredValue(STORAGE_KEYS.knownServers)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useServerConnection(): ServerConnection {
  const [url, setUrl] = useState(DEFAULT_SERVER_URL)
  const [health, setHealth] = useState<ServerHealth | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [knownServers, setKnownServers] = useState<string[]>(DEFAULT_SERVER_URLS)

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shouldReconnectRef = useRef(true)
  const requestIdRef = useRef(0)
  const connectRef = useRef<(targetUrl?: string) => Promise<ServerHealth | null>>(async () => null)

  const updateKnownServers = useCallback((nextUrl: string) => {
    if (!nextUrl) {
      return
    }

    setKnownServers((current) => {
      const updated = unique([...current, nextUrl])
      writeStoredValue(STORAGE_KEYS.knownServers, JSON.stringify(updated))
      return updated
    })
  }, [])

  const applyHealth = useCallback(
    (result: ServerHealth, targetUrl: string) => {
      setHealth(result)
      setUrl(targetUrl)

      if (result.connected) {
        setError(null)
        writeStoredValue(STORAGE_KEYS.lastUrl, targetUrl)
        updateKnownServers(targetUrl)
      } else {
        setError(result.error ?? 'Unable to connect to server')
      }
    },
    [updateKnownServers],
  )

  const runHealthCheck = useCallback(async (targetUrl: string): Promise<ServerHealth> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS)

    try {
      return await checkServerHealth({ baseUrl: targetUrl, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }
  }, [])

  const scheduleReconnect = useCallback((targetUrl: string) => {
    if (!shouldReconnectRef.current || reconnectTimerRef.current) {
      return
    }

    setIsReconnecting(true)
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      setIsReconnecting(false)
      void connectRef.current(targetUrl)
    }, RECONNECT_DELAY_MS)
  }, [])

  const connect = useCallback(
    async (targetUrl?: string) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      shouldReconnectRef.current = true

      const nextUrl = normalizeUrl(targetUrl ?? url ?? DEFAULT_SERVER_URL)
      if (!nextUrl) {
        setError('Server URL is required')
        setHealth(null)
        return null
      }

      setIsConnecting(true)
      setError(null)

      const result = await runHealthCheck(nextUrl)
      if (requestId !== requestIdRef.current) {
        return result
      }

      applyHealth(result, nextUrl)
      setIsConnecting(false)

      if (!result.connected) {
        scheduleReconnect(nextUrl)
      }

      return result
    },
    [applyHealth, runHealthCheck, scheduleReconnect, url],
  )

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (healthTimerRef.current) {
      clearInterval(healthTimerRef.current)
      healthTimerRef.current = null
    }

    setHealth(null)
    setError(null)
  }, [])

  const scanForServers = useCallback(async () => {
    const candidates = unique([...knownServers, ...DEFAULT_SERVER_URLS]).map(normalizeUrl)
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        if (!candidate) {
          return null
        }
        const result = await runHealthCheck(candidate)
        return result.connected ? candidate : null
      }),
    )

    const found = unique(results.filter(Boolean) as string[])
    if (found.length > 0) {
      setKnownServers((current) => unique([...current, ...found]))
    }

    return found
  }, [knownServers, runHealthCheck])

  useEffect(() => {
    const storedUrl = readStoredValue(STORAGE_KEYS.lastUrl)
    const storedServers = readStoredServers()
    const candidates = unique([
      storedUrl ? normalizeUrl(storedUrl) : '',
      ...storedServers.map(normalizeUrl),
      ...DEFAULT_SERVER_URLS,
    ])

    setKnownServers(unique([...storedServers, ...DEFAULT_SERVER_URLS]))

    if (candidates.length === 0) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    shouldReconnectRef.current = true
    setIsConnecting(true)

    const attempt = async () => {
      for (const candidate of candidates) {
        if (!candidate) {
          continue
        }
        const result = await runHealthCheck(candidate)
        if (requestId !== requestIdRef.current) {
          return
        }

        if (result.connected) {
          applyHealth(result, candidate)
          setIsConnecting(false)
          return
        }
      }

      const fallback = normalizeUrl(storedUrl ?? DEFAULT_SERVER_URL)
      if (fallback) {
        const result = await runHealthCheck(fallback)
        if (requestId === requestIdRef.current) {
          applyHealth(result, fallback)
          setIsConnecting(false)
          if (!result.connected) {
            scheduleReconnect(fallback)
          }
        }
      } else {
        setIsConnecting(false)
      }
    }

    void attempt()
  }, [applyHealth, runHealthCheck, scheduleReconnect])

  useEffect(() => {
    if (!health?.connected || !url) {
      return
    }

    const interval = setInterval(async () => {
      const result = await runHealthCheck(url)
      applyHealth(result, url)

      if (!result.connected) {
        scheduleReconnect(url)
      }
    }, HEALTH_CHECK_INTERVAL_MS)

    healthTimerRef.current = interval

    return () => {
      clearInterval(interval)
      if (healthTimerRef.current === interval) {
        healthTimerRef.current = null
      }
    }
  }, [applyHealth, health?.connected, runHealthCheck, scheduleReconnect, url])

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }

      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current)
      }
    }
  }, [])

  const compatibility = useMemo<ServerCompatibility>(() => {
    if (!health?.connected) {
      return 'unknown'
    }

    if (!health.version) {
      return 'unknown'
    }

    return compareVersions(health.version, MIN_SERVER_VERSION) >= 0 ? 'compatible' : 'incompatible'
  }, [health])

  return {
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
  }
}
