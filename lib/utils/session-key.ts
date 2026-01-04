import type { Project } from '@/lib/opencode'

const SESSION_KEY_SEPARATOR = '::'

export interface SessionKeyInfo {
  sessionId: string
  directory: string
  projectId: string | null
}

export const buildSessionKey = (directory: string, sessionId: string): string => {
  const encodedDirectory = encodeURIComponent(directory)
  return `${encodedDirectory}${SESSION_KEY_SEPARATOR}${sessionId}`
}

export const parseSessionKey = (
  sessionKey: string,
): { sessionId: string; directory: string } | null => {
  const separatorIndex = sessionKey.indexOf(SESSION_KEY_SEPARATOR)
  if (separatorIndex <= 0) {
    return null
  }

  const encodedDirectory = sessionKey.slice(0, separatorIndex)
  const sessionId = sessionKey.slice(separatorIndex + SESSION_KEY_SEPARATOR.length)
  if (!sessionId) {
    return null
  }

  try {
    const directory = decodeURIComponent(encodedDirectory)
    return { sessionId, directory }
  } catch {
    return null
  }
}

export const resolveSessionKey = (
  sessionKey: string,
  projects: Project[] = [],
): SessionKeyInfo | null => {
  const parsed = parseSessionKey(sessionKey)
  if (!parsed) {
    return null
  }

  const projectId = projects.find((project) => project.worktree === parsed.directory)?.id ?? null
  return { ...parsed, projectId }
}
