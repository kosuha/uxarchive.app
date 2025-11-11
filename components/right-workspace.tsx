"use client"

import * as React from "react"
import Image from "next/image"
import { Camera, Pin, Share2, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Capture, Insight, Pattern } from "@/lib/types"
import { useStorageCollections } from "@/lib/use-storage-collections"
import { cn } from "@/lib/utils"

type RightWorkspaceProps = {
  patternId?: string
}

export function RightWorkspace({ patternId }: RightWorkspaceProps) {
  const { patterns, captures, insights } = useStorageCollections()

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
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
  }, [insights, activeCapture])

  const [highlightedInsightId, setHighlightedInsightId] = React.useState<
    string | null
  >(null)

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
    <div className="flex flex-1 gap-4 overflow-hidden">
      <section className="flex min-h-[640px] flex-1 flex-col rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-sm">
        <CanvasHeader
          captureOrder={captureIndex}
          totalCount={patternCaptures.length}
        />
        <CaptureCanvas
          capture={activeCapture}
          insights={captureInsights}
          highlightedInsightId={highlightedInsightId}
          onHighlight={setHighlightedInsightId}
        />
        <CaptureStrip
          captures={patternCaptures}
          activeId={activeCaptureId}
          onSelect={setActiveCaptureId}
        />
      </section>
      <aside className="flex w-full max-w-[360px] flex-1 flex-col gap-4">
        <PatternMetadata pattern={pattern} captureCount={patternCaptures.length} />
        <InsightsPanel
          insights={captureInsights}
          highlightedInsightId={highlightedInsightId}
          onHighlight={setHighlightedInsightId}
        />
      </aside>
    </div>
  )
}

function CanvasHeader({
  captureOrder,
  totalCount,
}: {
  captureOrder: number
  totalCount: number
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          현재 캡처
        </p>
        <p className="text-lg font-semibold">
          {captureOrder ? `${captureOrder} / ${totalCount}` : "-"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
        >
          <Pin className="size-3.5 mr-2" />
          핀 추가
        </Button>
        <Button
          variant="outline"
          size="sm"
        >
          <Share2 className="size-3.5 mr-2" />
          공유
        </Button>
      </div>
    </div>
  )
}

function CaptureCanvas({
  capture,
  insights,
  highlightedInsightId,
  onHighlight,
}: {
  capture?: Capture
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
}) {
  if (!capture) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
        <Camera className="size-6" />
        <p>선택된 캡처가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-6 pb-6 pt-4">
      <div className="absolute inset-x-0 -z-10 h-[25%] bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="relative flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="relative flex h-full w-full max-w-[960px] items-center justify-center">
          <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border bg-white shadow-xl">
            <Image
              src={capture.imageUrl}
              alt="패턴 캡처"
              fill
              sizes="(min-width: 1280px) 60vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0)_0%,_rgba(15,23,42,0.08)_100%)]" />
            {insights.map((insight, index) => (
              <Tooltip key={insight.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseEnter={() => onHighlight(insight.id)}
                    onMouseLeave={() => onHighlight(null)}
                    onFocus={() => onHighlight(insight.id)}
                    onBlur={() => onHighlight(null)}
                    className={cn(
                      "absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white font-semibold text-xs text-white shadow-lg transition-all",
                      highlightedInsightId === insight.id
                        ? "bg-primary"
                        : "bg-black/70"
                    )}
                    style={{
                      left: `${insight.x}%`,
                      top: `${insight.y}%`,
                    }}
                  >
                    {index + 1}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="max-w-[220px] text-xs">{insight.note}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CaptureStrip({
  captures,
  activeId,
  onSelect,
}: {
  captures: Capture[]
  activeId?: string
  onSelect: (id: string) => void
}) {
  if (!captures.length) {
    return null
  }

  return (
    <div className="border-t border-border/60 px-4 py-4">
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Camera className="size-3.5" />
          캡처 스트립
        </div>
        <span className="text-xs text-muted-foreground">
          {captures.length}개
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto px-2">
        {captures.map((capture) => {
          const isActive = activeId === capture.id
          return (
            <button
              type="button"
              key={capture.id}
              onClick={() => onSelect(capture.id)}
              className={cn(
                "relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border text-left transition-all focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary/70 shadow-md"
                  : "border-border/60 hover:border-primary/60"
              )}
            >
              <Image
                src={capture.imageUrl}
                alt="캡처 썸네일"
                fill
                sizes="80px"
                className="object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 text-[10px] font-medium text-white">
                {capture.order}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PatternMetadata({
  pattern,
  captureCount,
}: {
  pattern: Pattern
  captureCount: number
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {pattern.serviceName}
          </p>
          <h2 className="text-md font-semibold leading-snug">
            {pattern.name}
          </h2>
        </div>
        {pattern.isFavorite && (
          <div className="rounded-full p-2 text-primary">
            <Star className="size-4 fill-current" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {pattern.tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
            style={{
              borderColor: tag.color,
              color: tag.color,
            }}
          >
            {tag.label}
          </span>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <MetadataItem label="작성자" value={pattern.author} />
        <MetadataItem
          label="최종 수정"
          value={formatDate(pattern.updatedAt)}
        />
        <MetadataItem label="캡처 수" value={`${captureCount}개`} />
        <MetadataItem label="생성일" value={formatDate(pattern.createdAt)} />
      </dl>
      <p className="text-sm text-muted-foreground">{pattern.summary}</p>
    </section>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function InsightsPanel({
  insights,
  highlightedInsightId,
  onHighlight,
}: {
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
}) {
  return (
    <section className="flex flex-1 flex-col rounded-xl border border-border/60 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            인사이트
          </p>
          <p className="text-md font-semibold">핀 노트</p>
        </div>
      </header>
      {insights.length ? (
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-3 py-4 pr-2">
            {insights.map((insight, index) => (
              <InsightCard
                key={insight.id}
                index={index + 1}
                insight={insight}
                isActive={highlightedInsightId === insight.id}
                onHighlight={onHighlight}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <Pin className="size-5" />
          아직 인사이트가 없습니다.
        </div>
      )}
    </section>
  )
}

function InsightCard({
  insight,
  index,
  isActive,
  onHighlight,
}: {
  insight: Insight
  index: number
  isActive: boolean
  onHighlight: (id: string | null) => void
}) {
  return (
    <article
      className={cn(
        "rounded-xl border px-4 py-3 text-sm transition-all",
        isActive
          ? "border-primary/70 bg-primary/5"
          : "border-border/60 bg-card"
      )}
      tabIndex={0}
      onMouseEnter={() => onHighlight(insight.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(insight.id)}
      onBlur={() => onHighlight(null)}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>핀 #{index}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        {insight.note}
      </p>
    </article>
  )
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}
