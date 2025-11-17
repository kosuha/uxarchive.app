"use client"

import { useSyncExternalStore } from "react"

export interface WorkspaceState {
  searchTerm: string
  folderFilterId: string | null
  favoriteOnly: boolean
  tagFilters: string[]
  selectedPatternId: string | null
  selectedCaptureId: string | null
  highlightedInsightId: string | null
}

const DEFAULT_STATE: WorkspaceState = {
  searchTerm: "",
  folderFilterId: null,
  favoriteOnly: false,
  tagFilters: [],
  selectedPatternId: null,
  selectedCaptureId: null,
  highlightedInsightId: null,
}

const STORAGE_KEY = "uxarchive_workspace_state"
const PERSIST_DELAY = 200

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined"

const hydrateFromStorage = (): WorkspaceState => {
  if (!isBrowser()) return { ...DEFAULT_STATE }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return { ...DEFAULT_STATE }
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    return {
      ...DEFAULT_STATE,
      ...parsed,
      tagFilters: Array.isArray(parsed.tagFilters) ? parsed.tagFilters : [],
    }
  } catch (error) {
    console.warn("[workspaceStore] failed to parse state", error)
    return { ...DEFAULT_STATE }
  }
}

let workspaceState: WorkspaceState = hydrateFromStorage()
const listeners = new Set<() => void>()
let persistTimer: ReturnType<typeof setTimeout> | null = null

const notify = () => {
  listeners.forEach((listener) => listener())
}

const schedulePersist = () => {
  if (!isBrowser()) return
  if (persistTimer) {
    clearTimeout(persistTimer)
  }
  persistTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceState))
    } catch (error) {
      console.error("[workspaceStore] failed to persist state", error)
    }
  }, PERSIST_DELAY)
}

const updateState = (updater: (prev: WorkspaceState) => WorkspaceState) => {
  const nextState = updater(workspaceState)
  const keys = Object.keys(nextState) as Array<keyof WorkspaceState>
  const hasChanged = keys.some((key) => nextState[key] !== workspaceState[key])
  workspaceState = nextState
  if (hasChanged) {
    notify()
    schedulePersist()
  }
}

const resetState = () => {
  workspaceState = { ...DEFAULT_STATE }
  notify()
  schedulePersist()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (isBrowser()) {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return
    if (event.newValue === event.oldValue) return
    workspaceState = hydrateFromStorage()
    notify()
  })
}

export const workspaceStore = {
  getState: () => workspaceState,
  subscribe,
  reset: resetState,
}

const uniq = (values: string[]) => Array.from(new Set(values))

const actions = {
  setSearchTerm: (value: string) => updateState((prev) => ({ ...prev, searchTerm: value })),
  setFolderFilterId: (folderId: string | null) => updateState((prev) => ({ ...prev, folderFilterId: folderId })),
  toggleFavoriteOnly: () => updateState((prev) => ({ ...prev, favoriteOnly: !prev.favoriteOnly })),
  setFavoriteOnly: (value: boolean) => updateState((prev) => ({ ...prev, favoriteOnly: value })),
  setTagFilters: (tagIds: string[]) => updateState((prev) => ({ ...prev, tagFilters: uniq(tagIds) })),
  toggleTagFilter: (tagId: string) =>
    updateState((prev) => {
      const next = new Set(prev.tagFilters)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return { ...prev, tagFilters: Array.from(next) }
    }),
  clearTagFilters: () => updateState((prev) => ({ ...prev, tagFilters: [] })),
  setSelectedPatternId: (patternId: string | null) => updateState((prev) => ({ ...prev, selectedPatternId: patternId })),
  setSelectedCaptureId: (captureId: string | null) => updateState((prev) => ({ ...prev, selectedCaptureId: captureId })),
  setHighlightedInsightId: (insightId: string | null) => updateState((prev) => ({ ...prev, highlightedInsightId: insightId })),
  resetWorkspaceState: resetState,
}

export const workspaceActions = actions

export const useWorkspaceStore = () => {
  return useSyncExternalStore(workspaceStore.subscribe, workspaceStore.getState, () => DEFAULT_STATE)
}
