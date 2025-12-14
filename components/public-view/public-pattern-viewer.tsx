"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

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
    viewCount?: number
    likeCount?: number
    forkCount?: number
    originalPatternId?: string | null
  }
  captures: Capture[]
  insights: Insight[]
  isAuthenticated: boolean
  canDownload: boolean
  isLiked?: boolean
}

export function PublicPatternViewer({ pattern, captures, insights, isAuthenticated, canDownload, isLiked }: PublicPatternViewerProps) {
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

  const noop = React.useCallback(() => { }, [])
  const noopAsync = React.useCallback(async () => { }, [])

  return (
    <div className="flex bg-[#0C0C0C] min-h-screen w-full flex-col dark">
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0C0C0C]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.svg"
              alt="UX Archive"
              width={50}
              height={50}
              className="h-12 w-12"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              asChild
              className="px-4 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              <Link href="/patterns">
                Explore Patterns
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="px-4 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              <Link href="/workspace">
                Workspace
              </Link>
            </Button>
          </div>
        </div>
      </nav>
      <div className="mx-auto flex h-full w-full max-w-[1600px] min-h-[600px] flex-1 min-h-0 flex-col gap-6 p-8 lg:flex-row lg:px-8">
        <aside className="order-1 flex w-full max-w-full flex-shrink-0 flex-col gap-4 min-h-0 lg:order-1 lg:h-full lg:w-[320px] lg:max-w-[360px]">
          <PublicPatternMetadataCard
            patternId={pattern.id}
            patternName={pattern.name}
            serviceName={pattern.serviceName}
            summary={pattern.summary}
            tags={pattern.tags}
            author={pattern.author}
            updatedAt={pattern.updatedAt}
            isAuthenticated={isAuthenticated}
            canDownload={canDownload}
            currentCaptureUrl={activeCapture?.imageUrl}
            viewCount={pattern.viewCount ?? 0}
            likeCount={pattern.likeCount ?? 0}
            forkCount={pattern.forkCount ?? 0}
            isLiked={isLiked ?? false}
          />
        </aside>
        <div className="order-2 flex h-full min-h-0 flex-1 lg:order-2">
          <CanvasSection
            activeCapture={activeCapture}
            activeCaptureId={activeCaptureId}
            captureInsights={captureInsights}
            captureOrder={captureIndex}
            captures={captures}
            patternName={pattern.name}
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
        <aside className="order-3 flex w-full max-w-full flex-shrink-0 flex-col gap-4 min-h-0 lg:order-3 lg:h-full lg:w-[320px] lg:max-w-[360px] lg:min-h-0">
          <PublicInsightsPanel
            insights={captureInsights}
            highlightedInsightId={highlightedInsightId}
            onHighlight={setHighlightedInsightId}
          />
        </aside>
      </div>
    </div>
  )
}
