"use client"

import * as React from "react"

import { CanvasSection } from "@/components/right-workspace/canvas-section"
import { InsightsPanel } from "@/components/right-workspace/insights-panel"
import { PatternMetadataCard } from "@/components/right-workspace/pattern-metadata-card"
import type { CanvasPoint } from "@/components/right-workspace/shared"
import { storageService } from "@/lib/storage"
import type { Insight } from "@/lib/types"
import { useStorageCollections } from "@/lib/use-storage-collections"

type RightWorkspaceProps = {
  patternId?: string
}

const generateInsightId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `insight-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function RightWorkspace({ patternId }: RightWorkspaceProps) {
  const { patterns, captures, insights, tags } = useStorageCollections()

  const resolvedPatternId = React.useMemo(
    () => patternId ?? patterns[0]?.id,
    [patternId, patterns]
  )

  const pattern = React.useMemo(
    () => patterns.find((item) => item.id === resolvedPatternId),
    [patterns, resolvedPatternId]
  )

  const patternCaptures = React.useMemo(() => {
    if (!pattern) return []
    return captures
      .filter((item) => item.patternId === pattern.id)
      .sort((a, b) => a.order - b.order)
  }, [captures, pattern])

  const [activeCaptureId, setActiveCaptureId] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (!patternCaptures.length) {
      setActiveCaptureId(undefined)
      return
    }

    setActiveCaptureId((current) => {
      if (current && patternCaptures.some((capture) => capture.id === current)) {
        return current
      }
      return patternCaptures[0]?.id
    })
  }, [patternCaptures])

  const activeCapture = React.useMemo(
    () => patternCaptures.find((capture) => capture.id === activeCaptureId),
    [patternCaptures, activeCaptureId]
  )

  const captureInsights = React.useMemo(() => {
    if (!activeCapture) return []
    return insights
      .filter((insight) => insight.captureId === activeCapture.id)
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
  }, [insights, activeCapture])

  const [highlightedInsightId, setHighlightedInsightId] = React.useState<string | null>(null)
  const [isPlacingInsight, setIsPlacingInsight] = React.useState(false)

  React.useEffect(() => {
    setIsPlacingInsight(false)
  }, [activeCapture?.id])

  const isAddingInsight = isPlacingInsight

  const handleToggleAddMode = React.useCallback(() => {
    if (!activeCapture) return
    setIsPlacingInsight((prev) => !prev)
  }, [activeCapture])

  const handleCanvasPlacement = React.useCallback(
    (point: CanvasPoint) => {
      if (!activeCapture) return
      const newInsight: Insight = {
        id: generateInsightId(),
        captureId: activeCapture.id,
        x: point.x,
        y: point.y,
        note: "",
        createdAt: new Date().toISOString(),
      }
      storageService.insights.create(newInsight)
      setHighlightedInsightId(newInsight.id)
      setIsPlacingInsight(false)
    },
    [activeCapture]
  )

  const handleUpdateInsightPosition = React.useCallback((insightId: string, point: CanvasPoint) => {
    storageService.insights.update(insightId, (current) => ({
      ...current,
      x: point.x,
      y: point.y,
    }))
  }, [])

  const handleDeleteInsight = React.useCallback((insightId: string) => {
    storageService.insights.remove(insightId)
    setHighlightedInsightId((current) => (current === insightId ? null : current))
  }, [])

  const handleUpdateInsightNote = React.useCallback((insightId: string, note: string) => {
    storageService.insights.update(insightId, (current) => ({
      ...current,
      note,
    }))
  }, [])

  if (!pattern) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed">
        표시할 패턴 데이터가 없습니다.
      </div>
    )
  }

  const captureIndex =
    activeCaptureId && patternCaptures.length
      ? patternCaptures.findIndex((capture) => capture.id === activeCaptureId) + 1
      : 0

  return (
    <div className="flex h-full min-h-0 flex-1 basis-0 gap-4 overflow-hidden">
      <CanvasSection
        activeCapture={activeCapture}
        activeCaptureId={activeCaptureId}
        captureInsights={captureInsights}
        captureOrder={captureIndex}
        captures={patternCaptures}
        highlightedInsightId={highlightedInsightId}
        isAddingInsight={isAddingInsight}
        isPlacingInsight={isPlacingInsight}
        onCanvasPlace={handleCanvasPlacement}
        onDeleteInsight={handleDeleteInsight}
        onHighlight={setHighlightedInsightId}
        onSelectCapture={(id) => setActiveCaptureId(id)}
        onToggleAddMode={handleToggleAddMode}
        onUpdateInsightPosition={handleUpdateInsightPosition}
      />
      <aside className="flex h-full w-full max-w-[360px] flex-1 basis-0 min-h-0 flex-col gap-4 overflow-hidden">
        <PatternMetadataCard pattern={pattern} allTags={tags} />
        <InsightsPanel
          pattern={pattern}
          insights={captureInsights}
          highlightedInsightId={highlightedInsightId}
          onHighlight={setHighlightedInsightId}
          onDeleteInsight={handleDeleteInsight}
          onUpdateInsightNote={handleUpdateInsightNote}
        />
      </aside>
    </div>
  )
}
