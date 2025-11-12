"use client"

import * as React from "react"
import Image from "next/image"
import { Camera, MessageCircle, Pin, Share2, Star, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagBadge } from "@/components/tag-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
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

const CONTEXT_MENU_ATTRIBUTE = "data-allow-context-menu"
const allowContextMenuProps = { [CONTEXT_MENU_ATTRIBUTE]: "true" } as const

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

  const handleDeleteInsight = React.useCallback(
    (insightId: string) => {
      storageService.insights.remove(insightId)
      setHighlightedInsightId((current) => (current === insightId ? null : current))
    },
    []
  )

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
      <section className="flex flex-1 basis-0 min-h-0 flex-col rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-sm md:min-h-[640px]">
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
          onCanvasPlace={handleCanvasPlacement}
          onUpdateInsightPosition={handleUpdateInsightPosition}
          onDeleteInsight={handleDeleteInsight}
        />
        <CaptureStrip
          captures={patternCaptures}
          activeId={activeCaptureId}
          onSelect={setActiveCaptureId}
        />
      </section>
      <aside className="flex h-full w-full max-w-[360px] flex-1 basis-0 min-h-0 flex-col gap-4 overflow-hidden">
        <PatternMetadata pattern={pattern} captureCount={patternCaptures.length} />
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
  onCanvasPlace,
  onUpdateInsightPosition,
  onDeleteInsight,
}: {
  capture?: Capture
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
  isPlacingInsight: boolean
  onCanvasPlace: (point: CanvasPoint) => void
  onUpdateInsightPosition: (insightId: string, point: CanvasPoint) => void
  onDeleteInsight: (insightId: string) => void
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
                <ContextMenu key={insight.id}>
                  <Tooltip>
                    <ContextMenuTrigger asChild>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          data-insight-marker
                          {...allowContextMenuProps}
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
                    </ContextMenuTrigger>
                    <TooltipContent side="top">
                      <p className="max-w-[220px] text-xs">{insight.note}</p>
                    </TooltipContent>
                  </Tooltip>
                  <ContextMenuContent align="start">
                    <ContextMenuItem
                      variant="destructive"
                      onSelect={(event) => {
                        event.preventDefault()
                        onDeleteInsight(insight.id)
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      인사이트 삭제
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
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
  const [serviceNameValue, setServiceNameValue] = React.useState(pattern.serviceName)
  const [nameValue, setNameValue] = React.useState(pattern.name)

  React.useEffect(() => {
    setServiceNameValue(pattern.serviceName)
    setNameValue(pattern.name)
  }, [pattern.serviceName, pattern.name, pattern.id])

  const updatePattern = React.useCallback(
    (updates: Partial<Pattern>) => {
      storageService.patterns.update(pattern.id, (current) => ({
        ...current,
        ...updates,
      }))
    },
    [pattern.id]
  )

  const commitServiceName = React.useCallback(() => {
    const next = serviceNameValue.trim()
    if (next === pattern.serviceName) return
    updatePattern({ serviceName: next })
  }, [serviceNameValue, pattern.serviceName, updatePattern])

  const commitName = React.useCallback(() => {
    const next = nameValue.trim()
    if (next === pattern.name) return
    updatePattern({ name: next })
  }, [nameValue, pattern.name, updatePattern])

  const handleServiceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setServiceNameValue(pattern.serviceName)
      event.currentTarget.blur()
    }
    if (event.key === "Enter") {
      event.preventDefault()
      commitServiceName()
      event.currentTarget.blur()
    }
  }

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setNameValue(pattern.name)
      event.currentTarget.blur()
    }
    if (event.key === "Enter") {
      event.preventDefault()
      commitName()
      event.currentTarget.blur()
    }
  }

  return (
    <section className="shrink-0 space-y-4 rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Input
            value={serviceNameValue}
            onChange={(event) => setServiceNameValue(event.target.value)}
            onBlur={commitServiceName}
            onKeyDown={handleServiceKeyDown}
            placeholder="서비스명을 입력하세요"
            className="text-muted-foreground rounded-none shadow-none hover:bg-primary/10 focus-visible:ring-0 focus-visible:border-none border-none bg-transparent px-0 py-0 !text-xs uppercase tracking-wide h-auto"
          />
          <Input
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            placeholder="패턴 이름을 입력하세요"
            className="!text-base font-semibold shadow-none rounded-none hover:bg-primary/10 leading-snug focus-visible:ring-0 focus-visible:border-none border-none bg-transparent px-0 py-0 h-auto"
          />
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

function PatternSummaryCard({ pattern }: { pattern: Pattern }) {
  const [value, setValue] = React.useState(pattern.summary)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setValue(pattern.summary)
  }, [pattern.summary, pattern.id])

  const resizeTextarea = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [])

  React.useLayoutEffect(() => {
    resizeTextarea()
  }, [value, resizeTextarea])

  const commitChange = React.useCallback(() => {
    const next = value.trim()
    if (next === pattern.summary) return
    storageService.patterns.update(pattern.id, (current) => ({
      ...current,
      summary: next,
    }))
  }, [value, pattern.summary, pattern.id])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setValue(pattern.summary)
      event.currentTarget.blur()
    }
  }

  const handleBlur = () => {
    commitChange()
  }

  return (
    <article className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Description
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="패턴 설명을 입력하세요"
        rows={2}
        className="mt-2 w-full resize-none rounded-none overflow-hidden border-none bg-transparent px-0 py-0 text-sm text-foreground shadow-none outline-none focus-visible:border-none focus-visible:ring-0"
      />
    </article>
  )
}

function InsightsPanel({
  pattern,
  insights,
  highlightedInsightId,
  onHighlight,
  onDeleteInsight,
  onUpdateInsightNote,
}: {
  pattern: Pattern
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
  onDeleteInsight: (insightId: string) => void
  onUpdateInsightNote: (insightId: string, note: string) => void
}) {
  return (
    <section className="flex h-full flex-1 basis-0 min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <p className="text-md font-semibold">Insights</p>
        </div>
      </header>
      <div className="flex flex-1 basis-0 min-h-0 flex-col px-2 py-0">
        <div className="flex flex-1 basis-0 min-h-0 flex-col">
          <ScrollArea className="flex-1 basis-0 min-h-0">
            <div className="space-y-3 pb-2 pt-2">
              <PatternSummaryCard pattern={pattern} />
              {insights.length ? (
                insights.map((insight, index) => (
                  <InsightCard
                    key={insight.id}
                    index={index + 1}
                    insight={insight}
                    isActive={highlightedInsightId === insight.id}
                    onHighlight={onHighlight}
                    onDelete={onDeleteInsight}
                    onUpdateNote={onUpdateInsightNote}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  <Pin className="size-5" />
                  아직 인사이트가 없습니다.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </section>
  )
}

function InsightCard({
  insight,
  index,
  isActive,
  onHighlight,
  onDelete,
  onUpdateNote,
}: {
  insight: Insight
  index: number
  isActive: boolean
  onHighlight: (id: string | null) => void
  onDelete: (id: string) => void
  onUpdateNote: (id: string, note: string) => void
}) {
  const [value, setValue] = React.useState(insight.note)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setValue(insight.note)
  }, [insight.note])

  const resizeTextarea = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [])

  React.useLayoutEffect(() => {
    resizeTextarea()
  }, [value, resizeTextarea])

  const commitChange = React.useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) {
      setValue(insight.note)
      return
    }
    if (trimmed === insight.note) return
    onUpdateNote(insight.id, trimmed)
  }, [value, insight.note, insight.id, onUpdateNote])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setValue(insight.note)
      event.currentTarget.blur()
      return
    }
  }

  const handleBlur = () => {
    commitChange()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          className={cn(
            "rounded-xl border px-4 py-3 text-sm transition-all",
            isActive
              ? "border-primary/70 bg-primary/5"
              : "border-border/60 bg-card"
          )}
          tabIndex={0}
          {...allowContextMenuProps}
          onMouseEnter={() => onHighlight(insight.id)}
          onMouseLeave={() => onHighlight(null)}
          onFocus={() => onHighlight(insight.id)}
          onBlur={() => onHighlight(null)}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Insight #{index}</span>
          </div>
          <Textarea
            {...allowContextMenuProps}
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="인사이트를 입력하세요"
            className="mt-2 w-full resize-none overflow-hidden rounded-none border-none bg-transparent px-0 py-0 text-sm leading-relaxed text-foreground shadow-none outline-none focus-visible:border-none focus-visible:ring-0"
            rows={1}
          />
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent align="start">
        <ContextMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault()
            onDelete(insight.id)
          }}
        >
          <Trash2 className="size-3.5" />
          인사이트 삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}
