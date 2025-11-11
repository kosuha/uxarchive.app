"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

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
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null)
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null)
  const [highlightedInsightId, setHighlightedInsightId] = useState<string | null>(null)

  const resolvedPatternId = useMemo(() => {
    if (!selectedPatternId) return null
    return snapshot.patterns.some((pattern) => pattern.id === selectedPatternId) ? selectedPatternId : null
  }, [snapshot.patterns, selectedPatternId])

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
    if (selectedCaptureId && capturesForActivePattern.some((capture) => capture.id === selectedCaptureId)) {
      return selectedCaptureId
    }
    return capturesForActivePattern[0].id ?? null
  }, [capturesForActivePattern, selectedCaptureId])

  const selectPattern = useCallback(
    (patternId: string | null) => {
      setSelectedPatternId(patternId)
      setHighlightedInsightId(null)
      if (!patternId) {
        setSelectedCaptureId(null)
        return
      }
      const firstCapture = sortCaptures(snapshot.captures.filter((capture) => capture.patternId === patternId))[0]
      setSelectedCaptureId(firstCapture?.id ?? null)
    },
    [snapshot.captures],
  )

  const selectCapture = useCallback((captureId: string | null) => {
    setSelectedCaptureId(captureId)
    setHighlightedInsightId(null)
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
    if (!highlightedInsightId) return null
    return insightsForActiveCapture.some((insight) => insight.id === highlightedInsightId) ? highlightedInsightId : null
  }, [highlightedInsightId, insightsForActiveCapture])

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
    setHighlightedInsightId(insight.id)
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
      if (highlightedInsightId === insightId) {
        setHighlightedInsightId(null)
      }
    },
    [highlightedInsightId],
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
    setHighlightedInsightId,
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
