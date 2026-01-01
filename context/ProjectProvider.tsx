'use client'

import { useObservable, useSelector } from '@legendapp/state/react'
import { createContext, type ReactNode, useCallback, useContext, useEffect } from 'react'
import type { Project } from '@/lib/opencode'
import { useOpenCode } from './OpenCodeProvider'

const LAST_PROJECT_KEY = 'opencode-last-project'

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

export interface ProjectContextValue {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  selectProject: (projectId: string) => Promise<void>
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { client } = useOpenCode()
  const state$ = useObservable({
    projects: [] as Project[],
    currentProject: null as Project | null,
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
      const projects = (result.data ?? []).slice().sort((a, b) => b.time.updated - a.time.updated)
      state$.projects.set(projects)

      const current = state$.currentProject.peek()
      if (current && !projects.some((project) => project.id === current.id)) {
        state$.currentProject.set(null)
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

  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  const projects = useSelector(() => state$.projects.get())
  const currentProject = useSelector(() => state$.currentProject.get())
  const isLoading = useSelector(() => state$.isLoading.get())

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
    isLoading,
    selectProject,
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
