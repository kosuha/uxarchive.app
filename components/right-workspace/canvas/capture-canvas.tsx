"use client"

import * as React from "react"
import { Layer, Stage, Image as KonvaImage } from "react-konva"
import { Html } from "react-konva-utils"
import { Download, FolderArchive, ImageUpscale, Loader2, Trash2 } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import type { Capture, Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

import { allowContextMenuProps, CanvasPoint, clampPercentage } from "../shared"
import { useCachedImage } from "./use-capture-image-cache"

type CaptureCanvasProps = {
  capture?: Capture
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
  isPlacingInsight: boolean
  onCanvasPlace: (point: CanvasPoint) => void
  onUpdateInsightPosition: (insightId: string, point: CanvasPoint) => void
  onDeleteInsight: (insightId: string) => void
  onDownloadCapture?: () => void
  onDownloadPattern?: () => void
  isCaptureDownloadPending?: boolean
  isPatternDownloadPending?: boolean
  canDownloadPattern?: boolean
  readOnly?: boolean
}

export function CaptureCanvas({
  capture,
  insights,
  highlightedInsightId,
  onHighlight,
  isPlacingInsight,
  onCanvasPlace,
  onUpdateInsightPosition,
  onDeleteInsight,
  onDownloadCapture,
  onDownloadPattern,
  isCaptureDownloadPending,
  isPatternDownloadPending,
  canDownloadPattern,
  readOnly,
}: CaptureCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = React.useState<{ id: string; x: number; y: number; isTransitioning?: boolean } | null>(null)
  const draggingIdRef = React.useRef<string | null>(null)
  const [canvasTransform, setCanvasTransform] = React.useState({ scale: 1, x: 0, y: 0 })
  const [isSpacePressed, setIsSpacePressed] = React.useState(false)
  const [isPanning, setIsPanning] = React.useState(false)
  const panStateRef = React.useRef({ startX: 0, startY: 0, originX: 0, originY: 0 })
  const panCleanupRef = React.useRef<(() => void) | null>(null)
  const fitScaleRef = React.useRef(0.5)
  const hasUserAdjustedRef = React.useRef(false)
  const [imageDimensions, setImageDimensions] = React.useState<{ width: number; height: number } | null>(null)
  const [isImageReady, setIsImageReady] = React.useState(false)
  const imageElement = useCachedImage(capture?.imageUrl ?? "")
  const [canvasSize, setCanvasSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 })

  React.useEffect(() => {
    setDragging(null)
    draggingIdRef.current = null
  }, [capture?.id])

  React.useEffect(() => {
    setIsImageReady(false)
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
  }, [capture?.id])

  React.useEffect(() => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setCanvasSize({ width: rect.width, height: rect.height })
  }, [capture?.id])

  const canEditInsights = !readOnly
  const captureDownloadDisabled = !capture?.imageUrl || !onDownloadCapture || Boolean(isCaptureDownloadPending)
  const patternDownloadDisabled = !canDownloadPattern || !onDownloadPattern || Boolean(isPatternDownloadPending)

  const handleCanvasClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlacingInsight || !canEditInsights) return
      const target = event.target as HTMLElement
      if (target.closest("[data-insight-marker]")) return
      const coords = getRelativePosition(event.clientX, event.clientY)
      if (!coords) return
      onCanvasPlace(coords)
    },
    [canEditInsights, getRelativePosition, isPlacingInsight, onCanvasPlace]
  )

  const startDragging = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, insightId: string) => {
      if (!canEditInsights) return
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const initial = getRelativePosition(event.clientX, event.clientY)
      if (!initial) return
      setDragging({ id: insightId, ...initial, isTransitioning: false })
      draggingIdRef.current = insightId
      onHighlight(insightId)

      const handleMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault()
        const coords = getRelativePosition(moveEvent.clientX, moveEvent.clientY)
        if (!coords) return
        setDragging({ id: insightId, ...coords, isTransitioning: false })
      }

      const finishDrag = (point?: CanvasPoint | null, persist = false) => {
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
        window.removeEventListener("pointercancel", handleCancel)
        if (persist && point) {
          setDragging({ id: insightId, ...point, isTransitioning: true })
          onUpdateInsightPosition(insightId, point)
        } else {
          setDragging(null)
        }
        draggingIdRef.current = null
        onHighlight(null)
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
    [canEditInsights, getRelativePosition, onHighlight, onUpdateInsightPosition]
  )

  const clampScale = React.useCallback((scale: number) => {
    const minScale = fitScaleRef.current || 0.1
    const maxScale = 3
    return Math.min(Math.max(scale, minScale), maxScale)
  }, [])

  React.useEffect(() => {
    if (!imageElement) {
      setImageDimensions(null)
      return
    }
    const width = imageElement.naturalWidth || imageElement.width
    const height = imageElement.naturalHeight || imageElement.height
    if (!width || !height) return
    setImageDimensions({ width, height })
  }, [imageElement])

  React.useEffect(() => {
    if (imageElement) {
      setIsImageReady(true)
    }
  }, [imageElement])

  const calculateFitTransform = React.useCallback(() => {
    if (!imageDimensions || canvasSize.width === 0 || canvasSize.height === 0) {
      return null
    }
    const baseScale = Math.min(
      canvasSize.width / imageDimensions.width,
      canvasSize.height / imageDimensions.height
    )
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

  React.useLayoutEffect(() => {
    if (!capture?.id) return
    if (!imageDimensions) return
    if (canvasSize.width === 0 || canvasSize.height === 0) return
    if (hasUserAdjustedRef.current) return
    applyFitToScreen()
    hasUserAdjustedRef.current = true
  }, [applyFitToScreen, capture?.id, imageDimensions, canvasSize.height, canvasSize.width])

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = React.useCallback(
    (event) => {
      if (!capture || !canvasRef.current) return
      event.preventDefault()
      hasUserAdjustedRef.current = true
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
    hasUserAdjustedRef.current = true
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
    hasUserAdjustedRef.current = true
    applyFitToScreen()
  }, [applyFitToScreen])

  React.useEffect(() => {
    if (!isSpacePressed && panCleanupRef.current) {
      panCleanupRef.current()
    }
  }, [isSpacePressed])

  React.useEffect(() => {
    setIsSpacePressed(false)
    setIsPanning(false)
    panCleanupRef.current?.()
    setImageDimensions(null)
    hasUserAdjustedRef.current = false
  }, [capture?.id])

  React.useEffect(() => {
    if (!dragging?.isTransitioning) return
    const matchingInsight = insights.find((insight) => insight.id === dragging.id)
    if (!matchingInsight) return
    const withinThreshold =
      Math.abs(matchingInsight.x - dragging.x) < 0.0001 &&
      Math.abs(matchingInsight.y - dragging.y) < 0.0001
    if (withinThreshold) {
      setDragging(null)
    }
  }, [dragging, insights])

  if (!capture) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
        <p>No capture selected.</p>
      </div>
    )
  }

  const contentWidth = Math.max(imageDimensions?.width ?? canvasSize.width, 1)
  const contentHeight = Math.max(imageDimensions?.height ?? canvasSize.height, 1)

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-x-0 -z-10 h-[25%] bg-gradient-to-b from-primary/10 to-transparent" />
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="relative flex h-full w-full flex-1 items-center justify-center"
            {...allowContextMenuProps}
          >
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
                <ImageUpscale className="size-4" />
              </Button>
              {canvasSize.width > 0 && canvasSize.height > 0 ? (
                <div
                  className={cn(
                    "absolute left-0 top-0 origin-top-left transition-opacity duration-200 ease-out",
                    isImageReady ? "opacity-100" : "opacity-0"
                  )}
                  style={{
                    width: contentWidth,
                    height: contentHeight,
                    transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
                  }}
                >
                  <Stage width={contentWidth} height={contentHeight} className="block">
                    <Layer listening={false}>
                      {imageElement && imageDimensions ? (
                        <KonvaImage
                          image={imageElement}
                          width={imageDimensions.width}
                          height={imageDimensions.height}
                          listening={false}
                        />
                      ) : null}
                    </Layer>
                    {imageDimensions && (
                      <Layer>
                        {insights.map((insight, index) => {
                          const isDragging = dragging?.id === insight.id
                          const position = isDragging ? dragging : { x: insight.x, y: insight.y }
                          const isActive = highlightedInsightId === insight.id || isDragging
                          const markerScale = canvasTransform.scale ? 1 / canvasTransform.scale : 1
                          const normalizedX = (position.x / 100) * imageDimensions.width
                          const normalizedY = (position.y / 100) * imageDimensions.height
                          return (
                            <Html
                              key={insight.clientId ?? insight.id}
                              groupProps={{
                                x: normalizedX,
                                y: normalizedY,
                                scaleX: markerScale,
                                scaleY: markerScale,
                              }}
                              divProps={{ style: { pointerEvents: "auto" } }}
                            >
                              {(() => {
                                const noteText = insight.note?.trim()
                                const button = (
                                  <button
                                    type="button"
                                    data-insight-marker
                                    {...allowContextMenuProps}
                                    onPointerDown={canEditInsights ? (event) => startDragging(event, insight.id) : undefined}
                                    onMouseEnter={() => onHighlight(insight.id)}
                                    onMouseLeave={() => {
                                      if (draggingIdRef.current === insight.id) return
                                      onHighlight(null)
                                    }}
                                    onFocus={() => onHighlight(insight.id)}
                                    onBlur={() => {
                                      if (draggingIdRef.current === insight.id) return
                                      onHighlight(null)
                                    }}
                                    className={cn(
                                      "flex size-6 items-center justify-center rounded-full border-2 border-white font-semibold text-xs text-white shadow-lg transition-colors",
                                      isActive ? "bg-primary" : "bg-black/70",
                                      canEditInsights ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                    )}
                                    style={{
                                      transform: "translate(-50%, -50%)",
                                      transformOrigin: "center",
                                    }}
                                  >
                                    {index + 1}
                                  </button>
                                )

                                const renderMarkerTrigger = () => {
                                  if (!noteText) {
                                    return canEditInsights ? (
                                      <ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
                                    ) : (
                                      button
                                    )
                                  }

                                  return (
                                    <Tooltip>
                                      {canEditInsights ? (
                                        <ContextMenuTrigger asChild>
                                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                                        </ContextMenuTrigger>
                                      ) : (
                                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                                      )}
                                      <TooltipContent
                                        side="top"
                                        className="max-w-[240px] whitespace-pre-line break-words text-left [text-wrap:wrap]"
                                      >
                                        <p className="text-xs leading-relaxed w-full">{noteText}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                }

                                const markerContent = renderMarkerTrigger()

                                if (!canEditInsights) {
                                  return markerContent
                                }

                                return (
                                  <ContextMenu>
                                    {markerContent}
                                    <ContextMenuContent>
                                      <ContextMenuItem
                                        variant="destructive"
                                        onSelect={(event) => {
                                          event.preventDefault()
                                          onDeleteInsight(insight.id)
                                        }}
                                      >
                                        <Trash2 className="size-3.5" />
                                        Delete insight
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                )
                              })()}
                            </Html>
                          )
                        })}
                      </Layer>
                    )}
                  </Stage>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  Preparing the canvas...
                </div>
              )}
              {!isImageReady && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  Loading image...
                </div>
              )}
              {isPlacingInsight && canEditInsights && (
                <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg">
                  Click on the canvas to set a position
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-60">
          <ContextMenuItem
            onSelect={() => {
              if (captureDownloadDisabled || !onDownloadCapture) return
              onDownloadCapture()
            }}
            disabled={captureDownloadDisabled}
          >
            {isCaptureDownloadPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Download capture image
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              if (patternDownloadDisabled || !onDownloadPattern) return
              onDownloadPattern()
            }}
            disabled={patternDownloadDisabled}
          >
            {isPatternDownloadPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FolderArchive className="size-3.5" />
            )}
            Download all captures (ZIP)
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}
