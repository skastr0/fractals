'use client'

import { use$, useObservable } from '@legendapp/state/react'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react'
import type { Project } from '@/lib/opencode'
import { getSelectedDirectories, isJunkWorktree } from '@/lib/utils/worktree'
import { useOpenCode } from './OpenCodeProvider'

const LAST_PROJECT_KEY = 'opencode-last-project'

const isJunkProject = (worktree: string): boolean => {
  return isJunkWorktree(worktree)
}

const readStoredProjectId = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem(LAST_PROJECT_KEY)
  } catch {
    return null
  }
}

const writeStoredProjectId = (projectId: string) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(LAST_PROJECT_KEY, projectId)
  } catch {
    return
  }
}

export const getActiveProject = ({
  currentProject,
  selectedProjectIds,
  projects,
}: {
  currentProject: Project | null
  selectedProjectIds: string[]
  projects: Project[]
}): Project | null => {
  // When multiple filters are selected, only use the current project if it's selected.
  if (selectedProjectIds.length === 0) {
    return currentProject
  }

  if (currentProject && selectedProjectIds.includes(currentProject.id)) {
    return currentProject
  }

  if (selectedProjectIds.length === 1) {
    return projects.find((project) => project.id === selectedProjectIds[0]) ?? null
  }

  return null
}

export interface ProjectContextValue {
  projects: Project[]
  currentProject: Project | null
  selectedProjectIds: string[]
  /** Directories included in the current selection (includes sandboxes) */
  selectedDirectories: Set<string> | null
  isLoading: boolean
  selectProject: (projectId: string) => Promise<void>
  toggleSelectedProject: (projectId: string) => void
  clearSelectedProjects: () => void
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode()
  const state$ = useObservable({
    projects: [] as Project[],
    currentProject: null as Project | null,
    selectedProjectIds: [] as string[],
    isLoading: false,
  })

  const refreshProjects = useCallback(async () => {
    if (!client) {
      state$.projects.set([])
      state$.currentProject.set(null)
      state$.isLoading.set(false)
      return
    }

    state$.isLoading.set(true)
    try {
      const result = await client.project.list()
      const allProjects = result.data ?? []
      const filteredProjects = allProjects.filter((project) => !isJunkProject(project.worktree))
      const projects = filteredProjects.slice().sort((a, b) => b.time.updated - a.time.updated)
      state$.projects.set(projects)

      const current = state$.currentProject.peek()
      if (current && !projects.some((project) => project.id === current.id)) {
        state$.currentProject.set(null)
      }

      const selectedIds = state$.selectedProjectIds.peek()
      if (selectedIds.length > 0) {
        const nextSelected = selectedIds.filter((id) =>
          projects.some((project) => project.id === id),
        )
        if (nextSelected.length !== selectedIds.length) {
          state$.selectedProjectIds.set(nextSelected)
        }
      }
    } finally {
      state$.isLoading.set(false)
    }
  }, [client, state$])

  const selectProject = useCallback(
    async (projectId: string) => {
      const project = state$.projects.peek().find((item) => item.id === projectId)
      if (project) {
        state$.currentProject.set(project)
      }
    },
    [state$],
  )

  const toggleSelectedProject = useCallback(
    (projectId: string) => {
      const selected = state$.selectedProjectIds.peek()
      if (selected.includes(projectId)) {
        state$.selectedProjectIds.set(selected.filter((id) => id !== projectId))
        return
      }
      state$.selectedProjectIds.set([...selected, projectId])
    },
    [state$],
  )

  const clearSelectedProjects = useCallback(() => {
    state$.selectedProjectIds.set([])
  }, [state$])

  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  const projects = use$(() => state$.projects.get())
  const currentProject = use$(() => state$.currentProject.get())
  const selectedProjectIds = use$(() => state$.selectedProjectIds.get())
  const isLoading = use$(() => state$.isLoading.get())

  // Derive the set of directories for the current selection (includes sandboxes)
  const selectedDirectories = useMemo(() => {
    if (selectedProjectIds.length === 0) {
      return null // null means "all projects" - no filtering
    }
    return getSelectedDirectories(projects, selectedProjectIds)
  }, [projects, selectedProjectIds])

  useEffect(() => {
    if (projects.length === 0) {
      if (currentProject) {
        state$.currentProject.set(null)
      }
      return
    }

    if (currentProject && projects.some((project) => project.id === currentProject.id)) {
      return
    }

    const storedId = readStoredProjectId()
    const storedProject = storedId ? projects.find((project) => project.id === storedId) : null
    const fallback = storedProject ?? projects[0]

    if (fallback) {
      state$.currentProject.set(fallback)
    }
  }, [currentProject, projects, state$])

  useEffect(() => {
    if (currentProject) {
      writeStoredProjectId(currentProject.id)
    }
  }, [currentProject])

  const value: ProjectContextValue = {
    projects,
    currentProject,
    selectedProjectIds,
    selectedDirectories,
    isLoading,
    selectProject,
    toggleSelectedProject,
    clearSelectedProjects,
    refreshProjects,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
