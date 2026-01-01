/**
 * Format a timestamp as relative time (e.g., "2h ago", "just now")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

/**
 * Format a duration in milliseconds to human readable (e.g., "1.5s", "250ms")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Format a timestamp as ISO date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0] ?? ''
}

/**
 * Format a timestamp as time string (HH:MM:SS)
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toTimeString().split(' ')[0] ?? ''
}
