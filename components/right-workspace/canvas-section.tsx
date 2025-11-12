"use client"

import * as React from "react"
import Image from "next/image"
import { Camera, MessageCircle, Share2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import type { Capture, Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

import { allowContextMenuProps, CanvasPoint, clampPercentage } from "./shared"

type CanvasSectionProps = {
  activeCapture?: Capture
  activeCaptureId?: string
  captureInsights: Insight[]
  captureOrder: number
  captures: Capture[]
  highlightedInsightId: string | null
  isAddingInsight: boolean
  isPlacingInsight: boolean
  onCanvasPlace: (point: CanvasPoint) => void
  onDeleteInsight: (insightId: string) => void
  onHighlight: (id: string | null) => void
  onSelectCapture: (captureId: string) => void
  onToggleAddMode: () => void
  onUpdateInsightPosition: (insightId: string, point: CanvasPoint) => void
}

export function CanvasSection({
  activeCapture,
  activeCaptureId,
  captureInsights,
  captureOrder,
  captures,
  highlightedInsightId,
  isAddingInsight,
  isPlacingInsight,
  onCanvasPlace,
  onDeleteInsight,
  onHighlight,
  onSelectCapture,
  onToggleAddMode,
  onUpdateInsightPosition,
}: CanvasSectionProps) {
  return (
    <section className="flex flex-1 basis-0 min-h-0 flex-col rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-sm md:min-h-[640px]">
      <CanvasHeader
        captureOrder={captureOrder}
        totalCount={captures.length}
        isAddingInsight={isAddingInsight}
        onAddInsight={onToggleAddMode}
        canAddInsight={Boolean(activeCapture)}
      />
      <CaptureCanvas
        capture={activeCapture}
        insights={captureInsights}
        highlightedInsightId={highlightedInsightId}
        onHighlight={onHighlight}
        isPlacingInsight={isPlacingInsight}
        onCanvasPlace={onCanvasPlace}
        onUpdateInsightPosition={onUpdateInsightPosition}
        onDeleteInsight={onDeleteInsight}
      />
      <CaptureStrip
        captures={captures}
        activeId={activeCaptureId}
        onSelect={onSelectCapture}
      />
    </section>
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
        <Button variant="outline" size="sm">
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
        <span className="text-xs text-muted-foreground">{captures.length}장</span>
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
