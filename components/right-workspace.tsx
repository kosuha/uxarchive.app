"use client"

import * as React from "react"
import Image from "next/image"
import { Camera, MessageCircle, Pin, Share2, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TagBadge } from "@/components/tag-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { storageService } from "@/lib/storage"
import type { Capture, Insight, Pattern } from "@/lib/types"
import { useStorageCollections } from "@/lib/use-storage-collections"
import { cn } from "@/lib/utils"

type RightWorkspaceProps = {
  patternId?: string
}

type CanvasPoint = {
  x: number
  y: number
}

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value))

const generateInsightId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `insight-${Date.now()}-${Math.random().toString(16).slice(2)}`
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

  const [isPlacingInsight, setIsPlacingInsight] = React.useState(false)
  const [draftPosition, setDraftPosition] = React.useState<CanvasPoint | null>(null)
  const [draftNote, setDraftNote] = React.useState("")

  const resetDraftState = React.useCallback(() => {
    setIsPlacingInsight(false)
    setDraftPosition(null)
    setDraftNote("")
  }, [])

  React.useEffect(() => {
    resetDraftState()
  }, [activeCapture?.id, resetDraftState])

  const isAddingInsight = isPlacingInsight || Boolean(draftPosition)

  const handleToggleAddMode = React.useCallback(() => {
    if (!activeCapture) return
    if (isAddingInsight) {
      resetDraftState()
      return
    }
    setDraftNote("")
    setIsPlacingInsight(true)
  }, [activeCapture, isAddingInsight, resetDraftState])

  const handleCanvasPlacement = React.useCallback(
    (point: CanvasPoint) => {
      if (!activeCapture) return
      setDraftPosition(point)
      setIsPlacingInsight(false)
      setDraftNote("")
    },
    [activeCapture]
  )

  const handleDraftCancel = React.useCallback(() => {
    resetDraftState()
  }, [resetDraftState])

  const handleDraftSubmit = React.useCallback(() => {
    if (!draftPosition || !activeCapture) {
      resetDraftState()
      return
    }

    const nextNote = draftNote.trim()
    if (!nextNote) {
      resetDraftState()
      return
    }

    const newInsight: Insight = {
      id: generateInsightId(),
      captureId: activeCapture.id,
      x: draftPosition.x,
      y: draftPosition.y,
      note: nextNote,
      createdAt: new Date().toISOString(),
    }

    storageService.insights.create(newInsight)
    setHighlightedInsightId(newInsight.id)
    resetDraftState()
  }, [draftPosition, activeCapture, draftNote, resetDraftState])

  const handleUpdateInsightPosition = React.useCallback((insightId: string, point: CanvasPoint) => {
    storageService.insights.update(insightId, (current) => ({
      ...current,
      x: point.x,
      y: point.y,
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
    <div className="flex flex-1 gap-4 overflow-hidden">
      <section className="flex min-h-[640px] flex-1 flex-col rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-sm">
        <CanvasHeader
          captureOrder={captureIndex}
          totalCount={patternCaptures.length}
          isAddingInsight={isAddingInsight}
          onAddInsight={handleToggleAddMode}
          canAddInsight={Boolean(activeCapture)}
        />
        <CaptureCanvas
          capture={activeCapture}
          insights={captureInsights}
          highlightedInsightId={highlightedInsightId}
          onHighlight={setHighlightedInsightId}
          isPlacingInsight={isPlacingInsight}
          draftInsightPosition={draftPosition}
          draftIndex={captureInsights.length + 1}
          onCanvasPlace={handleCanvasPlacement}
          onUpdateInsightPosition={handleUpdateInsightPosition}
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
          showDraftInput={Boolean(draftPosition)}
          draftNote={draftNote}
          draftIndex={captureInsights.length + 1}
          onDraftChange={setDraftNote}
          onDraftSubmit={handleDraftSubmit}
          onDraftCancel={handleDraftCancel}
        />
      </aside>
    </div>
  )
}

function CanvasHeader({
  captureOrder,
  totalCount,
  isAddingInsight,
  onAddInsight,
  canAddInsight,
}: {
  captureOrder: number
  totalCount: number
  isAddingInsight: boolean
  onAddInsight: () => void
  canAddInsight: boolean
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
          variant={isAddingInsight ? "default" : "outline"}
          size="sm"
          onClick={onAddInsight}
          disabled={!canAddInsight}
          aria-pressed={isAddingInsight}
        >
          <MessageCircle className="size-3.5 mr-2" />
          {isAddingInsight ? "추가 취소" : "인사이트 추가"}
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
  isPlacingInsight,
  draftInsightPosition,
  draftIndex,
  onCanvasPlace,
  onUpdateInsightPosition,
}: {
  capture?: Capture
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
  isPlacingInsight: boolean
  draftInsightPosition: CanvasPoint | null
  draftIndex: number
  onCanvasPlace: (point: CanvasPoint) => void
  onUpdateInsightPosition: (insightId: string, point: CanvasPoint) => void
}) {
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = React.useState<{ id: string; x: number; y: number } | null>(null)

  React.useEffect(() => {
    setDragging(null)
  }, [capture?.id])

  const getRelativePosition = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return null
      const x = clampPercentage(((clientX - rect.left) / rect.width) * 100)
      const y = clampPercentage(((clientY - rect.top) / rect.height) * 100)
      return { x, y }
    },
    []
  )

  const handleCanvasClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlacingInsight) return
      const target = event.target as HTMLElement
      if (target.closest("[data-insight-marker]")) return
      const coords = getRelativePosition(event.clientX, event.clientY)
      if (!coords) return
      onCanvasPlace(coords)
    },
    [isPlacingInsight, getRelativePosition, onCanvasPlace]
  )

  const startDragging = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, insightId: string) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const initial = getRelativePosition(event.clientX, event.clientY)
      if (!initial) return
      setDragging({ id: insightId, ...initial })

      const handleMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault()
        const coords = getRelativePosition(moveEvent.clientX, moveEvent.clientY)
        if (!coords) return
        setDragging({ id: insightId, ...coords })
      }

      const finishDrag = (point?: CanvasPoint | null, persist = false) => {
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
        window.removeEventListener("pointercancel", handleCancel)
        setDragging(null)
        if (persist && point) {
          onUpdateInsightPosition(insightId, point)
        }
      }

      const handleUp = (upEvent: PointerEvent) => {
        upEvent.preventDefault()
        const coords = getRelativePosition(upEvent.clientX, upEvent.clientY)
        finishDrag(coords ?? initial, true)
      }

      const handleCancel = (cancelEvent: PointerEvent) => {
        cancelEvent.preventDefault()
        finishDrag(null, false)
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
      window.addEventListener("pointercancel", handleCancel)
    },
    [getRelativePosition, onUpdateInsightPosition]
  )

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
          <div
            ref={canvasRef}
            className={cn(
              "relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border bg-white shadow-xl",
              isPlacingInsight && "cursor-crosshair"
            )}
            onClick={handleCanvasClick}
          >
            <Image
              src={capture.imageUrl}
              alt="패턴 캡처"
              fill
              sizes="(min-width: 1280px) 60vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0)_0%,_rgba(15,23,42,0.08)_100%)]" />
            {isPlacingInsight && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg">
                캔버스를 클릭해 위치를 지정하세요
              </div>
            )}
            {insights.map((insight, index) => {
              const isDragging = dragging?.id === insight.id
              const position = isDragging ? dragging : { x: insight.x, y: insight.y }
              const isActive = highlightedInsightId === insight.id || isDragging
              return (
                <Tooltip key={insight.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-insight-marker
                      onPointerDown={(event) => startDragging(event, insight.id)}
                      onMouseEnter={() => onHighlight(insight.id)}
                      onMouseLeave={() => onHighlight(null)}
                      onFocus={() => onHighlight(insight.id)}
                      onBlur={() => onHighlight(null)}
                      className={cn(
                        "absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white font-semibold text-xs text-white shadow-lg",
                        isDragging ? "transition-none" : "transition-all",
                        isActive ? "bg-primary" : "bg-black/70",
                        "cursor-grab active:cursor-grabbing"
                      )}
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                      }}
                    >
                      {index + 1}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-[220px] text-xs">{insight.note}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
            {draftInsightPosition && (
              <div
                className="absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-primary/60 bg-primary/20 text-xs font-semibold text-primary"
                style={{
                  left: `${draftInsightPosition.x}%`,
                  top: `${draftInsightPosition.y}%`,
                }}
              >
                {draftIndex}
              </div>
            )}
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
          {captures.length}장
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
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <MetadataItem label="작성자" value={pattern.author} />
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
  showDraftInput,
  draftNote,
  draftIndex,
  onDraftChange,
  onDraftSubmit,
  onDraftCancel,
}: {
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
  showDraftInput: boolean
  draftNote: string
  draftIndex: number
  onDraftChange: (value: string) => void
  onDraftSubmit: () => void
  onDraftCancel: () => void
}) {
  const hasContent = insights.length > 0 || showDraftInput
  return (
    <section className="flex flex-1 flex-col rounded-xl border border-border/60 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <p className="text-md font-semibold">인사이트 노트</p>
        </div>
      </header>
      {hasContent ? (
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-3 py-4 pr-2">
            {showDraftInput && (
              <DraftInsightCard
                index={draftIndex}
                value={draftNote}
                onChange={onDraftChange}
                onSubmit={onDraftSubmit}
                onCancel={onDraftCancel}
              />
            )}
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
        <span>Insight #{index}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        {insight.note}
      </p>
    </article>
  )
}

function DraftInsightCard({
  index,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  index: number
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const cancelNextBlurRef = React.useRef(false)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      cancelNextBlurRef.current = true
      onCancel()
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      onSubmit()
    }
  }

  const handleBlur = () => {
    if (cancelNextBlurRef.current) {
      cancelNextBlurRef.current = false
      return
    }
    onSubmit()
  }

  return (
    <article className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary">
        <span>Insight #{index}</span>
        <span className="text-[11px]">작성 중</span>
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="인사이트를 입력하세요"
        className="mt-3 bg-white/70"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        엔터 또는 포커스 아웃으로 저장, ESC로 취소됩니다.
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
