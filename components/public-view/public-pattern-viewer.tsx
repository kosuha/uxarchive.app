"use client"

import * as React from "react"

import { CanvasSection } from "@/components/right-workspace/canvas-section"
import type { Capture, Insight, Tag } from "@/lib/types"

import { PublicInsightsPanel } from "./public-insights-panel"
import { PublicPatternMetadataCard } from "./public-pattern-metadata-card"

type PublicPatternViewerProps = {
  pattern: {
    id: string
    name: string
    serviceName?: string | null
    summary?: string | null
    author?: string | null
    updatedAt?: string | null
    tags: Tag[]
  }
  captures: Capture[]
  insights: Insight[]
}

export function PublicPatternViewer({ pattern, captures, insights }: PublicPatternViewerProps) {
  const [activeCaptureId, setActiveCaptureId] = React.useState<string | undefined>(captures[0]?.id)
  const activeCapture = React.useMemo(
    () => captures.find((capture) => capture.id === activeCaptureId),
    [captures, activeCaptureId],
  )
  const captureInsights = React.useMemo(() => {
    if (!activeCapture) return []
    return insights
      .filter((insight) => insight.captureId === activeCapture.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [activeCapture, insights])
  const captureIndex = activeCapture ? captures.findIndex((capture) => capture.id === activeCapture.id) + 1 : 0
  const [highlightedInsightId, setHighlightedInsightId] = React.useState<string | null>(null)

  const noop = React.useCallback(() => {}, [])
  const noopAsync = React.useCallback(async () => {}, [])

  return (
    <div className="flex h-full w-full min-h-[600px] flex-1 flex-col gap-6 lg:min-h-0 lg:flex-row">
      <aside className="order-1 flex w-full max-w-full flex-shrink-0 flex-col gap-4 min-h-0 lg:order-1 lg:h-full lg:w-[320px] lg:max-w-[360px]">
        <PublicPatternMetadataCard
          patternName={pattern.name}
          serviceName={pattern.serviceName}
          summary={pattern.summary}
          tags={pattern.tags}
          author={pattern.author}
          updatedAt={pattern.updatedAt}
        />
      </aside>
      <div className="order-2 flex h-full min-h-0 flex-1 lg:order-2">
        <CanvasSection
          activeCapture={activeCapture}
          activeCaptureId={activeCaptureId}
          captureInsights={captureInsights}
          captureOrder={captureIndex}
          captures={captures}
          highlightedInsightId={highlightedInsightId}
          isAddingInsight={false}
          isPlacingInsight={false}
          readOnly
          onCanvasPlace={noop}
          onDeleteInsight={noop}
          onHighlight={setHighlightedInsightId}
          onSelectCapture={setActiveCaptureId}
          onToggleAddMode={noop}
          onUpdateInsightPosition={noop}
          onUploadCapture={noopAsync}
          onReorderCapture={noop}
          onDeleteCapture={noop}
        />
      </div>
      <aside className="order-3 flex w-full max-w-full flex-shrink-0 flex-col gap-4 lg:order-3 lg:h-full lg:w-[320px] lg:max-w-[360px]">
        <PublicInsightsPanel
          insights={captureInsights}
          highlightedInsightId={highlightedInsightId}
          onHighlight={setHighlightedInsightId}
        />
      </aside>
    </div>
  )
}
