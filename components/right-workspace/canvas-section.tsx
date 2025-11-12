"use client"

import * as React from "react"
import Image from "next/image"
import { Camera, Maximize, Maximize2, MessageCircle, Share2, Trash2 } from "lucide-react"

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
  const [canvasTransform, setCanvasTransform] = React.useState({ scale: 1, x: 0, y: 0 })
  const [isSpacePressed, setIsSpacePressed] = React.useState(false)
  const [isPanning, setIsPanning] = React.useState(false)
  const panStateRef = React.useRef({ startX: 0, startY: 0, originX: 0, originY: 0 })
  const panCleanupRef = React.useRef<(() => void) | null>(null)
  const fitScaleRef = React.useRef(0.5)
  const shouldAutoFitRef = React.useRef(true)
  const [imageDimensions, setImageDimensions] = React.useState<{ width: number; height: number } | null>(null)
  const [canvasSize, setCanvasSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 })

  React.useEffect(() => {
    setDragging(null)
  }, [capture?.id])

  const getRelativePosition = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return null
      if (!imageDimensions) return null
      const offsetX = clientX - rect.left
      const offsetY = clientY - rect.top
      const adjustedX = (offsetX - canvasTransform.x) / canvasTransform.scale
      const adjustedY = (offsetY - canvasTransform.y) / canvasTransform.scale
      const x = clampPercentage((adjustedX / imageDimensions.width) * 100)
      const y = clampPercentage((adjustedY / imageDimensions.height) * 100)
      return { x, y }
    },
    [canvasTransform, imageDimensions]
  )

  React.useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return
    if (!canvasRef.current) return
    const element = canvasRef.current
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setCanvasSize({ width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setCanvasSize({ width: rect.width, height: rect.height })
  }, [])

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

  const clampScale = React.useCallback((scale: number) => {
    const minScale = fitScaleRef.current || 0.1
    const maxScale = 3
    return Math.min(Math.max(scale, minScale), maxScale)
  }, [])

  const handleImageLoad = React.useCallback((img: HTMLImageElement) => {
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!capture?.imageUrl) return
    let isCancelled = false
    const preloadImage = new window.Image()
    preloadImage.src = capture.imageUrl
    preloadImage.onload = () => {
      if (isCancelled) return
      const width = preloadImage.naturalWidth || preloadImage.width
      const height = preloadImage.naturalHeight || preloadImage.height
      if (!width || !height) return
      setImageDimensions((current) => current ?? { width, height })
    }
    return () => {
      isCancelled = true
    }
  }, [capture?.imageUrl])

  const calculateFitTransform = React.useCallback(() => {
    if (!imageDimensions || canvasSize.width === 0 || canvasSize.height === 0) {
      return null
    }
    const baseScale = Math.min(
      canvasSize.width / imageDimensions.width,
      canvasSize.height / imageDimensions.height
    )
    // 약간의 여백을 주어 화면에 맞추기 시 캔버스 테두리가 드러나도록 함
    const paddingScale = baseScale * 0.95
    const x = (canvasSize.width - imageDimensions.width * paddingScale) / 2
    const y = (canvasSize.height - imageDimensions.height * paddingScale) / 2
    fitScaleRef.current = paddingScale
    return { scale: paddingScale, x, y }
  }, [canvasSize.height, canvasSize.width, imageDimensions])

  const applyFitToScreen = React.useCallback(() => {
    const fit = calculateFitTransform()
    if (!fit) return
    panCleanupRef.current?.()
    setCanvasTransform(fit)
    setIsSpacePressed(false)
    setIsPanning(false)
  }, [calculateFitTransform])

  React.useEffect(() => {
    if (!shouldAutoFitRef.current) return
    if (!imageDimensions) return
    if (canvasSize.width === 0 || canvasSize.height === 0) return
    applyFitToScreen()
    shouldAutoFitRef.current = false
  }, [applyFitToScreen, imageDimensions, canvasSize.height, canvasSize.width])

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = React.useCallback(
    (event) => {
      if (!capture || !canvasRef.current) return
      event.preventDefault()
      const { deltaY, clientX, clientY } = event
      const rect = canvasRef.current.getBoundingClientRect()
      const pointerX = clientX - rect.left
      const pointerY = clientY - rect.top
      setCanvasTransform((current) => {
        const nextScale = clampScale(current.scale * (1 - deltaY * 0.001))
        const contentX = (pointerX - current.x) / current.scale
        const contentY = (pointerY - current.y) / current.scale
        return {
          scale: nextScale,
          x: pointerX - contentX * nextScale,
          y: pointerY - contentY * nextScale,
        }
      })
    },
    [clampScale, capture]
  )

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      const target = event.target as HTMLElement | null
      const interactiveTags = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"]
      if (target && (interactiveTags.includes(target.tagName) || target.isContentEditable)) {
        return
      }
      event.preventDefault()
      setIsSpacePressed(true)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      setIsSpacePressed(false)
      setIsPanning(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const startPanning = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSpacePressed) return
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    panCleanupRef.current?.()
    setIsPanning(true)
    panStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: canvasTransform.x,
      originY: canvasTransform.y,
    }

    const handleMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      const deltaX = moveEvent.clientX - panStateRef.current.startX
      const deltaY = moveEvent.clientY - panStateRef.current.startY
      setCanvasTransform((current) => ({
        scale: current.scale,
        x: panStateRef.current.originX + deltaX,
        y: panStateRef.current.originY + deltaY,
      }))
    }

    const stopPanning = () => {
      setIsPanning(false)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", stopPanning)
      window.removeEventListener("pointercancel", stopPanning)
      panCleanupRef.current = null
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", stopPanning)
    window.addEventListener("pointercancel", stopPanning)
    panCleanupRef.current = stopPanning
  }, [canvasTransform, isSpacePressed])

  const handleFitToScreen = React.useCallback(() => {
    applyFitToScreen()
  }, [applyFitToScreen])

  React.useEffect(() => {
    if (!isSpacePressed && panCleanupRef.current) {
      panCleanupRef.current()
    }
  }, [isSpacePressed])

  React.useEffect(() => {
    setCanvasTransform({ scale: 1, x: 0, y: 0 })
    setIsSpacePressed(false)
    setIsPanning(false)
    panCleanupRef.current?.()
    setImageDimensions(null)
    shouldAutoFitRef.current = true
  }, [capture?.id])

  if (!capture) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
        <Camera className="size-6" />
        <p>선택된 캡처가 없습니다.</p>
      </div>
    )
  }

  const contentWidth = (imageDimensions?.width ?? canvasSize.width) || 1
  const contentHeight = (imageDimensions?.height ?? canvasSize.height) || 1

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-x-0 -z-10 h-[25%] bg-gradient-to-b from-primary/10 to-transparent" />
      {/* <div className="relative flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-muted/30 p-4"> */}
        <div className="relative flex h-full w-full max-w-[960px] items-center justify-center">
          <div
            ref={canvasRef}
            className={cn(
              "relative h-full min-h-[420px] w-full overflow-hidden bg-gray-500 shadow-xl",
              isPlacingInsight && !isSpacePressed && "cursor-crosshair",
              isSpacePressed && !isPanning && "cursor-grab",
              isPanning && "cursor-grabbing"
            )}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
            onPointerDownCapture={startPanning}
          >
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-4 bottom-4 z-20"
              disabled={!imageDimensions}
              onClick={(event) => {
                event.stopPropagation()
                handleFitToScreen()
              }}
            >
              <Maximize2 className="size-4" />
            </Button>
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: contentWidth || 0,
                height: contentHeight || 0,
                transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
              }}
            >
              <div className="relative h-full w-full">
                <Image
                  src={capture.imageUrl}
                  alt="패턴 캡처"
                  fill
                  sizes="(min-width: 1280px) 60vw, 100vw"
                  className="object-contain bg-gray-500"
                  priority
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  onLoadingComplete={handleImageLoad}
                />
                <div className="pointer-events-none absolute inset-0" />
                {imageDimensions &&
                  insights.map((insight, index) => {
                    const isDragging = dragging?.id === insight.id
                    const position = isDragging ? dragging : { x: insight.x, y: insight.y }
                    const isActive = highlightedInsightId === insight.id || isDragging
                    const markerScale = canvasTransform.scale ? 1 / canvasTransform.scale : 1
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
                                "absolute flex size-9 items-center justify-center rounded-full border-2 border-white font-semibold text-xs text-white shadow-lg transition-colors",
                                isActive ? "bg-primary" : "bg-black/70",
                                "cursor-grab active:cursor-grabbing"
                              )}
                              style={{
                                left: `${position.x}%`,
                                top: `${position.y}%`,
                                transform: `translate(-50%, -50%) scale(${markerScale})`,
                                transformOrigin: "center",
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
            {isPlacingInsight && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg">
                캔버스를 클릭해 위치를 지정하세요
              </div>
            )}
          </div>
        </div>
      {/* </div> */}
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
