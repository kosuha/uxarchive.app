"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

import { useStorageCollections } from "@/lib/use-storage-collections"
import type { Capture, Pattern, StorageCollections } from "@/lib/types"

interface PatternWorkspaceContextValue {
  snapshot: StorageCollections
  selectedPatternId: string | null
  selectPattern: (patternId: string | null) => void
  selectedCaptureId: string | null
  selectCapture: (captureId: string | null) => void
  activePattern: Pattern | null
  capturesForActivePattern: Capture[]
  activeCapture: Capture | null
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
  }, [])

  const activeCapture = useMemo(() => {
    if (!resolvedCaptureId) return null
    return capturesForActivePattern.find((capture) => capture.id === resolvedCaptureId) ?? null
  }, [capturesForActivePattern, resolvedCaptureId])

  const value: PatternWorkspaceContextValue = {
    snapshot,
    selectedPatternId: resolvedPatternId,
    selectPattern,
    selectedCaptureId: resolvedCaptureId,
    selectCapture,
    activePattern,
    capturesForActivePattern,
    activeCapture,
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
