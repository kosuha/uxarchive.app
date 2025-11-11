"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react"

import { workspaceActions, useWorkspaceStore } from "@/lib/state"
import { patternMatchesFilters } from "@/lib/pattern-filters"
import { useStorageCollections } from "@/lib/use-storage-collections"
import { storageService } from "@/lib/storage"
import type { Capture, Insight, Pattern, StorageCollections } from "@/lib/types"

const generateInsightId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `insight-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

const sortInsights = (insights: Insight[]) =>
  [...insights].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

export interface CreateInsightPayload {
  captureId: string
  note: string
  x: number
  y: number
}

export interface UpdateInsightPayload {
  note?: string
  x?: number
  y?: number
}

interface PatternWorkspaceContextValue {
  snapshot: StorageCollections
  selectedPatternId: string | null
  selectPattern: (patternId: string | null) => void
  selectedCaptureId: string | null
  selectCapture: (captureId: string | null) => void
  activePattern: Pattern | null
  capturesForActivePattern: Capture[]
  activeCapture: Capture | null
  insightsForActiveCapture: Insight[]
  highlightedInsightId: string | null
  setHighlightedInsightId: (insightId: string | null) => void
  createInsight: (payload: CreateInsightPayload) => Insight | null
  updateInsight: (insightId: string, payload: UpdateInsightPayload) => Insight | null
  deleteInsight: (insightId: string) => void
}

const PatternWorkspaceContext = createContext<PatternWorkspaceContextValue | null>(null)

const sortCaptures = (captures: Capture[]) =>
  [...captures].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

export const PatternWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const snapshot = useStorageCollections()
  const workspaceState = useWorkspaceStore()

  const filteredPatternIds = useMemo(() => {
    return snapshot.patterns
      .filter((pattern) =>
        patternMatchesFilters(pattern, {
          searchTerm: workspaceState.searchTerm,
          folderFilterId: workspaceState.folderFilterId,
          favoriteOnly: workspaceState.favoriteOnly,
          tagFilters: workspaceState.tagFilters,
        }),
      )
      .map((pattern) => pattern.id)
  }, [snapshot.patterns, workspaceState.searchTerm, workspaceState.folderFilterId, workspaceState.favoriteOnly, workspaceState.tagFilters])

  useEffect(() => {
    if (!workspaceState.selectedPatternId) return
    if (!filteredPatternIds.includes(workspaceState.selectedPatternId)) {
      workspaceActions.setSelectedPatternId(null)
      workspaceActions.setSelectedCaptureId(null)
      workspaceActions.setHighlightedInsightId(null)
    }
  }, [filteredPatternIds, workspaceState.selectedPatternId])

  const resolvedPatternId = useMemo(() => {
    if (!workspaceState.selectedPatternId) return null
    return filteredPatternIds.includes(workspaceState.selectedPatternId) ? workspaceState.selectedPatternId : null
  }, [filteredPatternIds, workspaceState.selectedPatternId])

  const activePattern = useMemo(() => {
    if (!resolvedPatternId) return null
    return snapshot.patterns.find((pattern) => pattern.id === resolvedPatternId) ?? null
  }, [snapshot.patterns, resolvedPatternId])

  const capturesForActivePattern = useMemo(() => {
    if (!resolvedPatternId) return []
    return sortCaptures(snapshot.captures.filter((capture) => capture.patternId === resolvedPatternId))
  }, [snapshot.captures, resolvedPatternId])

  const resolvedCaptureId = useMemo(() => {
    if (!capturesForActivePattern.length) return null
    if (workspaceState.selectedCaptureId && capturesForActivePattern.some((capture) => capture.id === workspaceState.selectedCaptureId)) {
      return workspaceState.selectedCaptureId
    }
    return capturesForActivePattern[0].id ?? null
  }, [capturesForActivePattern, workspaceState.selectedCaptureId])

  useEffect(() => {
    if (workspaceState.selectedCaptureId === resolvedCaptureId) return
    workspaceActions.setSelectedCaptureId(resolvedCaptureId)
  }, [resolvedCaptureId, workspaceState.selectedCaptureId])

  const selectPattern = useCallback(
    (patternId: string | null) => {
      workspaceActions.setSelectedPatternId(patternId)
      workspaceActions.setHighlightedInsightId(null)
      if (!patternId) {
        workspaceActions.setSelectedCaptureId(null)
        return
      }
      const firstCapture = sortCaptures(snapshot.captures.filter((capture) => capture.patternId === patternId))[0]
      workspaceActions.setSelectedCaptureId(firstCapture?.id ?? null)
    },
    [snapshot.captures],
  )

  const selectCapture = useCallback((captureId: string | null) => {
    workspaceActions.setSelectedCaptureId(captureId)
    workspaceActions.setHighlightedInsightId(null)
  }, [])

  const activeCapture = useMemo(() => {
    if (!resolvedCaptureId) return null
    return capturesForActivePattern.find((capture) => capture.id === resolvedCaptureId) ?? null
  }, [capturesForActivePattern, resolvedCaptureId])

  const insightsForActiveCapture = useMemo(() => {
    if (!resolvedCaptureId) return []
    return sortInsights(snapshot.insights.filter((insight) => insight.captureId === resolvedCaptureId))
  }, [snapshot.insights, resolvedCaptureId])

  const resolvedHighlightedInsightId = useMemo(() => {
    if (!workspaceState.highlightedInsightId) return null
    return insightsForActiveCapture.some((insight) => insight.id === workspaceState.highlightedInsightId)
      ? workspaceState.highlightedInsightId
      : null
  }, [workspaceState.highlightedInsightId, insightsForActiveCapture])

  useEffect(() => {
    if (workspaceState.highlightedInsightId === resolvedHighlightedInsightId) return
    workspaceActions.setHighlightedInsightId(resolvedHighlightedInsightId)
  }, [resolvedHighlightedInsightId, workspaceState.highlightedInsightId])

  const createInsight = useCallback((payload: CreateInsightPayload) => {
    if (!payload.captureId) return null
    const insight: Insight = {
      id: generateInsightId(),
      captureId: payload.captureId,
      note: payload.note,
      x: payload.x,
      y: payload.y,
      createdAt: new Date().toISOString(),
    }
    storageService.insights.create(insight)
    workspaceActions.setHighlightedInsightId(insight.id)
    return insight
  }, [])

  const updateInsight = useCallback((insightId: string, payload: UpdateInsightPayload) => {
    const updated = storageService.insights.update(insightId, (current) => ({
      ...current,
      ...payload,
    }))
    return updated ?? null
  }, [])

  const deleteInsight = useCallback(
    (insightId: string) => {
      storageService.insights.remove(insightId)
      if (workspaceState.highlightedInsightId === insightId) {
        workspaceActions.setHighlightedInsightId(null)
      }
    },
    [workspaceState.highlightedInsightId],
  )

  const value: PatternWorkspaceContextValue = {
    snapshot,
    selectedPatternId: resolvedPatternId,
    selectPattern,
    selectedCaptureId: resolvedCaptureId,
    selectCapture,
    activePattern,
    capturesForActivePattern,
    activeCapture,
    insightsForActiveCapture,
    highlightedInsightId: resolvedHighlightedInsightId,
    setHighlightedInsightId: workspaceActions.setHighlightedInsightId,
    createInsight,
    updateInsight,
    deleteInsight,
  }

  return <PatternWorkspaceContext.Provider value={value}>{children}</PatternWorkspaceContext.Provider>
}

export const usePatternWorkspace = () => {
  const context = useContext(PatternWorkspaceContext)
  if (!context) {
    throw new Error("usePatternWorkspace는 PatternWorkspaceProvider 내부에서만 사용할 수 있습니다.")
  }
  return context
}
