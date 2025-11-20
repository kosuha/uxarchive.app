"use client"

import * as React from "react"
import Image from "next/image"
import { Layer, Stage, Image as KonvaImage } from "react-konva"
import { Html } from "react-konva-utils"
import { Download, FolderArchive, GalleryHorizontalEnd, ImageUpscale, Loader2, MessageCircle, Minus, Plus, Trash2, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { downloadRemoteImage, downloadZipFromUrls, sanitizeFilename } from "@/lib/downloads"
import type { Capture, Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

import { allowContextMenuProps, CanvasPoint, clampPercentage } from "./shared"

const CACHE_WINDOW_SIZE = 7
const CACHE_RADIUS = Math.floor(CACHE_WINDOW_SIZE / 2)
const MAX_CAPTURE_IMAGE_CACHE = CACHE_WINDOW_SIZE
const captureImageCache = new Map<string, HTMLImageElement>()

const getCachedImage = (url: string) => {
  const cached = captureImageCache.get(url)
  if (!cached) return null
  // LRU 갱신
  captureImageCache.delete(url)
  captureImageCache.set(url, cached)
  return cached
}

const putCachedImage = (url: string, image: HTMLImageElement) => {
  if (captureImageCache.has(url)) {
    captureImageCache.delete(url)
  } else if (captureImageCache.size >= MAX_CAPTURE_IMAGE_CACHE) {
    const oldestKey = captureImageCache.keys().next().value
    if (oldestKey) {
      captureImageCache.delete(oldestKey)
    }
  }
  captureImageCache.set(url, image)
}

const pickCacheWindow = (captures: Capture[], activeId?: string): Capture[] => {
  if (!activeId || captures.length === 0) return []

  const activeIndex = captures.findIndex((capture) => capture.id === activeId)
  if (activeIndex === -1) return []

  const maxWindow = Math.min(CACHE_WINDOW_SIZE, captures.length)
  let start = activeIndex - CACHE_RADIUS
  let end = activeIndex + CACHE_RADIUS

  if (start < 0) {
    end = Math.min(end + Math.abs(start), captures.length - 1)
    start = 0
  }

  if (end >= captures.length) {
    const overshoot = end - captures.length + 1
    start = Math.max(0, start - overshoot)
    end = captures.length - 1
  }

  const window: Capture[] = []
  for (let index = start; index <= end && window.length < maxWindow; index++) {
    window.push(captures[index])
  }

  return window
}

function usePrefetchCaptureImages(captures: Capture[], activeId?: string) {
  React.useEffect(() => {
    if (!activeId || captures.length === 0) return

    const windowCaptures = pickCacheWindow(captures, activeId)
    const targetUrls = new Set(
      windowCaptures
        .map((capture) => capture.imageUrl?.trim())
        .filter((url): url is string => Boolean(url))
    )

    for (const key of Array.from(captureImageCache.keys())) {
      if (!targetUrls.has(key)) {
        captureImageCache.delete(key)
      }
    }

    const listeners: Array<{ img: HTMLImageElement; handleLoad: () => void; handleError: () => void }> = []

    targetUrls.forEach((url) => {
      const cached = getCachedImage(url)
      if (cached && cached.complete && cached.naturalWidth > 0) {
        return
      }

      const img = new window.Image()
      img.crossOrigin = "anonymous"
      img.src = url

      const handleLoad = () => putCachedImage(url, img)
      const handleError = () => {
        captureImageCache.delete(url)
      }

      img.addEventListener("load", handleLoad)
      img.addEventListener("error", handleError)
      listeners.push({ img, handleLoad, handleError })
    })

    return () => {
      listeners.forEach(({ img, handleLoad, handleError }) => {
        img.removeEventListener("load", handleLoad)
        img.removeEventListener("error", handleError)
      })
    }
  }, [captures, activeId])
}

function useCachedImage(url?: string) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)

  React.useEffect(() => {
    if (!url) {
      setImage(null)
      return
    }

    const cached = getCachedImage(url)
    if (cached && cached.complete && cached.naturalWidth > 0) {
      setImage(cached)
      return
    }

    let isMounted = true
    const img = cached ?? new window.Image()
    img.crossOrigin = "anonymous"
    if (!cached) {
      img.src = url
    }

    const handleLoad = () => {
      if (!isMounted) return
      putCachedImage(url, img)
      setImage(img)
    }

    const handleError = () => {
      if (!isMounted) return
      setImage(null)
    }

    if (img.complete && img.naturalWidth > 0) {
      handleLoad()
    } else {
      img.addEventListener("load", handleLoad)
      img.addEventListener("error", handleError)
    }

    return () => {
      isMounted = false
      img.removeEventListener("load", handleLoad)
      img.removeEventListener("error", handleError)
    }
  }, [url])

  return image
}

export type CaptureUploadPayload = {
  file: File
  order: number
}

type CanvasSectionProps = {
  activeCapture?: Capture
  activeCaptureId?: string
  captureInsights: Insight[]
  captureOrder: number
  captures: Capture[]
  highlightedInsightId: string | null
  isAddingInsight: boolean
  isPlacingInsight: boolean
  patternName?: string
  readOnly?: boolean
  shareButton?: React.ReactNode
  onCanvasPlace: (point: CanvasPoint) => void
  onDeleteInsight: (insightId: string) => void
  onHighlight: (id: string | null) => void
  onSelectCapture: (captureId: string) => void
  onToggleAddMode: () => void
  onUpdateInsightPosition: (insightId: string, point: CanvasPoint) => void
  onUploadCapture: (payload: CaptureUploadPayload) => Promise<void> | void
  onReorderCapture: (sourceId: string, targetId: string, position: CaptureReorderPosition) => void
  onDeleteCapture: (captureId: string) => void
}

type CaptureReorderPosition = "before" | "after"

export function CanvasSection({
  activeCapture,
  activeCaptureId,
  captureInsights,
  captureOrder,
  captures,
  highlightedInsightId,
  isAddingInsight,
  isPlacingInsight,
  patternName,
  readOnly,
  shareButton,
  onCanvasPlace,
  onDeleteInsight,
  onHighlight,
  onSelectCapture,
  onToggleAddMode,
  onUpdateInsightPosition,
  onUploadCapture,
  onReorderCapture,
  onDeleteCapture,
}: CanvasSectionProps) {
  const readOnlyMode = Boolean(readOnly)
  const { toast } = useToast()
  const [isCaptureDownloadPending, setCaptureDownloadPending] = React.useState(false)
  const [isPatternDownloadPending, setPatternDownloadPending] = React.useState(false)
  const patternFilenameToken = React.useMemo(() => sanitizeFilename(patternName ?? "pattern"), [patternName])
  const hasDownloadablePattern = React.useMemo(() => captures.some((item) => Boolean(item.imageUrl)), [captures])

  usePrefetchCaptureImages(captures, activeCaptureId)

  const selectAdjacentCapture = React.useCallback(
    (direction: "prev" | "next") => {
      if (!activeCaptureId || captures.length === 0) return
      const currentIndex = captures.findIndex((item) => item.id === activeCaptureId)
      if (currentIndex === -1) return
      const nextIndex = direction === "next"
        ? Math.min(currentIndex + 1, captures.length - 1)
        : Math.max(currentIndex - 1, 0)
      if (nextIndex !== currentIndex) {
        onSelectCapture(captures[nextIndex].id)
      }
    },
    [activeCaptureId, captures, onSelectCapture]
  )

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const interactiveTags = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"]
      if (target && (interactiveTags.includes(target.tagName) || target.isContentEditable)) {
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        selectAdjacentCapture("prev")
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        selectAdjacentCapture("next")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectAdjacentCapture])

  const handleDownloadActiveCapture = React.useCallback(async () => {
    if (!activeCapture?.imageUrl) return
    setCaptureDownloadPending(true)
    const orderLabel = captureOrder > 0 ? String(captureOrder).padStart(2, "0") : String(activeCapture.order ?? 1).padStart(2, "0")
    const baseFilename = `${patternFilenameToken}-capture-${orderLabel}`
    try {
      await downloadRemoteImage(activeCapture.imageUrl, baseFilename)
      toast({ title: "다운로드 준비 중", description: "현재 캡처 이미지를 저장합니다." })
    } catch (error) {
      console.error("Failed to download capture image", error)
      toast({
        variant: "destructive",
        title: "캡처 이미지 다운로드 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
      })
    } finally {
      setCaptureDownloadPending(false)
    }
  }, [activeCapture, captureOrder, patternFilenameToken, toast])

  const handleDownloadPatternImages = React.useCallback(async () => {
    if (!hasDownloadablePattern) return
    setPatternDownloadPending(true)
    try {
      const zipEntries = captures
        .filter((item) => Boolean(item.imageUrl))
        .map((item, index) => ({
          url: item.imageUrl,
          filename: `${patternFilenameToken}-capture-${String(index + 1).padStart(2, "0")}`,
        }))
      if (!zipEntries.length) {
        throw new Error("다운로드 가능한 이미지가 없습니다.")
      }
      await downloadZipFromUrls(zipEntries, `${patternFilenameToken}-captures`)
      toast({ title: "ZIP 준비 중", description: "모든 캡처 이미지를 묶어서 내려받습니다." })
    } catch (error) {
      console.error("Failed to download pattern images", error)
      toast({
        variant: "destructive",
        title: "패턴 전체 이미지 다운로드 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
      })
    } finally {
      setPatternDownloadPending(false)
    }
  }, [captures, hasDownloadablePattern, patternFilenameToken, toast])
  return (
    <section className="flex flex-1 basis-0 min-h-0 min-w-0 flex-col rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-sm md:min-h-[640px]">
      <CanvasHeader
        captureOrder={captureOrder}
        totalCount={captures.length}
        isAddingInsight={isAddingInsight}
        onAddInsight={onToggleAddMode}
        canAddInsight={Boolean(activeCapture)}
        shareButton={!readOnlyMode ? shareButton : null}
        readOnly={readOnlyMode}
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
        onDownloadCapture={handleDownloadActiveCapture}
        onDownloadPattern={handleDownloadPatternImages}
        isCaptureDownloadPending={isCaptureDownloadPending}
        isPatternDownloadPending={isPatternDownloadPending}
        canDownloadPattern={hasDownloadablePattern}
        readOnly={readOnlyMode}
      />
      <CaptureStrip
        captures={captures}
        activeId={activeCaptureId}
        onSelect={onSelectCapture}
        onUploadCapture={onUploadCapture}
        onReorderCapture={onReorderCapture}
        onDeleteCapture={onDeleteCapture}
        readOnly={readOnlyMode}
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
  shareButton,
  readOnly,
}: {
  captureOrder: number
  totalCount: number
  isAddingInsight: boolean
  onAddInsight: () => void
  canAddInsight: boolean
  shareButton?: React.ReactNode
  readOnly?: boolean
}) {
  const isReadOnly = Boolean(readOnly)
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Current capture
        </p>
        <p className="text-lg font-semibold">
          {captureOrder ? `${captureOrder} / ${totalCount}` : "-"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!isReadOnly && (
          <Button
            variant={isAddingInsight ? "default" : "outline"}
            size="sm"
            onClick={onAddInsight}
            disabled={!canAddInsight}
            aria-pressed={isAddingInsight}
          >
            <MessageCircle className="size-3.5 mr-2" />
            {isAddingInsight ? "Cancel" : "Add insight"}
          </Button>
        )}
        {!isReadOnly && shareButton}
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
  onDownloadCapture,
  onDownloadPattern,
  isCaptureDownloadPending,
  isPatternDownloadPending,
  canDownloadPattern,
  readOnly,
}: {
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
}) {
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
    // Slightly offset so the canvas border remains visible when fitting to screen
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

function CaptureStrip({
  captures,
  activeId,
  onSelect,
  onUploadCapture,
  onReorderCapture,
  onDeleteCapture,
  readOnly,
}: {
  captures: Capture[]
  activeId?: string
  onSelect: (id: string) => void
  onUploadCapture: (payload: CaptureUploadPayload) => Promise<void> | void
  onReorderCapture: (sourceId: string, targetId: string, position: CaptureReorderPosition) => void
  onDeleteCapture: (captureId: string) => void
  readOnly?: boolean
}) {
  const hasCaptures = captures.length > 0
  const isReadOnly = Boolean(readOnly)
  const allowDnD = !isReadOnly
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropHint, setDropHint] = React.useState<{
    targetId: string
    position: CaptureReorderPosition
  } | null>(null)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const resetDragState = React.useCallback(() => {
    setDraggingId(null)
    setDropHint(null)
  }, [])

  const handleDialogOpenChange = React.useCallback((open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setDeleteTargetId(null)
    }
  }, [])

  const handleConfirmDelete = React.useCallback(() => {
    if (!deleteTargetId) return
    onDeleteCapture(deleteTargetId)
    setDeleteTargetId(null)
    setDeleteDialogOpen(false)
  }, [deleteTargetId, onDeleteCapture])

  const handleDragStart = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>, captureId: string) => {
      if (!allowDnD) return
      setDraggingId(captureId)
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", captureId)
    },
    [allowDnD]
  )

  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>, targetId: string) => {
      if (!allowDnD) return
      if (!draggingId || draggingId === targetId) return
      event.preventDefault()
      const rect = event.currentTarget.getBoundingClientRect()
      const isAfter = event.clientX - rect.left > rect.width / 2
      setDropHint({
        targetId,
        position: isAfter ? "after" : "before",
      })
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move"
      }
    },
    [allowDnD, draggingId]
  )

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>, targetId: string) => {
      if (!allowDnD) return
      event.preventDefault()
      event.stopPropagation()
      const sourceId = event.dataTransfer?.getData("text/plain")
      if (!sourceId || sourceId === targetId) {
        resetDragState()
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      const isAfter = event.clientX - rect.left > rect.width / 2
      onReorderCapture(sourceId, targetId, isAfter ? "after" : "before")
      resetDragState()
    },
    [allowDnD, onReorderCapture, resetDragState]
  )

  const handleContainerDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!allowDnD) return
      if (!draggingId) return
      event.preventDefault()
      const sourceId = event.dataTransfer?.getData("text/plain")
      if (!sourceId || captures.length === 0) {
        resetDragState()
        return
      }
      const lastCapture = captures[captures.length - 1]
      if (!lastCapture || sourceId === lastCapture.id) {
        resetDragState()
        return
      }
      onReorderCapture(sourceId, lastCapture.id, "after")
      resetDragState()
    },
    [allowDnD, captures, draggingId, onReorderCapture, resetDragState]
  )

  const handleContainerDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!allowDnD) return
      if (!draggingId) return
      event.preventDefault()
    },
    [allowDnD, draggingId]
  )

  const handleContainerDragLeave = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!allowDnD) return
    const nextTarget = event.relatedTarget as Node | null
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setDropHint(null)
    }
  }, [allowDnD])

  const handleDeleteClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, captureId: string) => {
      if (isReadOnly) return
      event.preventDefault()
      event.stopPropagation()
      setDeleteTargetId(captureId)
      setDeleteDialogOpen(true)
    },
    [isReadOnly]
  )

  return (
    <div className="w-full min-w-0 border-t border-border/60 px-4 py-4">
      <div className="w-full mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <GalleryHorizontalEnd className="size-3.5" />
            Capture strip
          </div>
          <span className="text-xs text-muted-foreground">{captures.length} items</span>
        </div>
        {!isReadOnly && (
          <CaptureUploadDialog
            captureCount={captures.length}
            onUploadCapture={onUploadCapture}
          />
        )}
      </div>
      {hasCaptures ? (
        <div className="relative w-full min-w-0 h-28">
          <div
            className="absolute inset-0 overflow-y-hidden overflow-x-auto"
            onDragOver={allowDnD ? handleContainerDragOver : undefined}
            onDrop={allowDnD ? handleContainerDrop : undefined}
            onDragLeave={allowDnD ? handleContainerDragLeave : undefined}
          >
            <div className="flex w-max max-w-none gap-2 px-2 pb-2">
              {captures.map((capture) => {
                const isActive = activeId === capture.id
                const isDragging = draggingId === capture.id
                const isDropBefore =
                  dropHint?.targetId === capture.id && dropHint.position === "before"
                const isDropAfter =
                  dropHint?.targetId === capture.id && dropHint.position === "after"
                const imageSrc = capture.imageUrl?.trim()
                return (
                  <div className="flex flex-none items-center gap-1" key={capture.id}>
                    {allowDnD && isDropBefore && <DropIndicator position="before" />}
                    <div className="group relative shrink-0">
                      <button
                        type="button"
                        draggable={allowDnD}
                        aria-grabbed={allowDnD ? isDragging : undefined}
                        onClick={() => onSelect(capture.id)}
                        onDragStart={allowDnD ? (event) => handleDragStart(event, capture.id) : undefined}
                        onDragEnd={allowDnD ? resetDragState : undefined}
                        onDragOver={allowDnD ? (event) => handleDragOver(event, capture.id) : undefined}
                        onDrop={allowDnD ? (event) => handleDrop(event, capture.id) : undefined}
                        className={cn(
                          "relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border text-left transition-all focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "border-2 border-primary/70 shadow-md"
                            : "border-border/60 hover:border-primary/60",
                          isDragging && "opacity-70 ring-2 ring-primary"
                        )}
                      >
                        {imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt="Capture thumbnail"
                            fill
                            sizes="80px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
                            No image
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 text-[10px] font-medium text-white">
                          {capture.order}
                        </span>
                      </button>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          onClick={(event) => handleDeleteClick(event, capture.id)}
                          aria-label="Delete capture"
                          draggable={false}
                          className={cn(
                            "absolute right-1 top-1 size-6 rounded-full bg-destructive p-0 text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-destructive/80",
                            isDragging && "pointer-events-none opacity-0"
                          )}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    {allowDnD && isDropAfter && <DropIndicator position="after" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-4 text-sm text-muted-foreground">
          {isReadOnly ? "No captures have been shared yet." : "No captures uploaded yet."}
          <span className="mt-1 text-xs text-muted-foreground/80">
            {isReadOnly ? "Once the author adds captures you'll see them here." : "Add a new capture image to get started."}
          </span>
        </div>
      )}
      {!isReadOnly && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDialogOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete capture?</AlertDialogTitle>
              <AlertDialogDescription>
                The selected capture and its related insights cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function DropIndicator({ position }: { position: CaptureReorderPosition }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-24 w-0.5 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.45)]",
        position === "before" ? "-ml-1" : "-mr-1"
      )}
    />
  )
}

function CaptureUploadDialog({
  captureCount,
  onUploadCapture,
}: {
  captureCount: number
  onUploadCapture: (payload: CaptureUploadPayload) => Promise<void> | void
}) {
  type SelectedPreview = { file: File; previewUrl: string }
  const [open, setOpen] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<SelectedPreview[]>([])
  const [order, setOrder] = React.useState(captureCount + 1)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const objectUrlsRef = React.useRef<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const fileInputId = React.useId()

  const revokeAllObjectUrls = React.useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
  }, [])

  const resetState = React.useCallback(() => {
    revokeAllObjectUrls()
    setSelectedFiles([])
    setOrder(captureCount + 1)
    setErrorMessage(null)
    setIsSubmitting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [captureCount, revokeAllObjectUrls])

  React.useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  React.useEffect(() => {
    setOrder((current) => {
      const maxOrder = captureCount + 1
      const normalized = Math.min(Math.max(current, 1), maxOrder)
      return Number.isNaN(normalized) ? maxOrder : normalized
    })
  }, [captureCount])

  React.useEffect(() => {
    return () => {
      revokeAllObjectUrls()
    }
  }, [revokeAllObjectUrls])

  const updatePreviews = React.useCallback(
    (files: File[]) => {
      if (!files.length) {
        revokeAllObjectUrls()
        setSelectedFiles([])
        return
      }
      revokeAllObjectUrls()
      const nextSelections = files.map((file) => {
        const previewUrl = URL.createObjectURL(file)
        objectUrlsRef.current.push(previewUrl)
        return { file, previewUrl }
      })
      setSelectedFiles(nextSelections)
    },
    [revokeAllObjectUrls]
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    updatePreviews(files)
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : []
    updatePreviews(files)
  }

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleRemoveFile = React.useCallback((previewUrl: string) => {
    URL.revokeObjectURL(previewUrl)
    objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== previewUrl)
    setSelectedFiles((current) => {
      const next = current.filter((item) => item.previewUrl !== previewUrl)
      if (!next.length && fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return next
    })
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFiles.length) {
      setErrorMessage("Please select an image to upload.")
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const maxOrder = captureCount + 1
      const baseOrder = Math.min(Math.max(order, 1), maxOrder)
      const uploadTasks = selectedFiles.map((item, index) =>
        Promise.resolve(onUploadCapture({ file: item.file, order: baseOrder + index }))
      )
      await Promise.all(uploadTasks)
      setOpen(false)
    } catch (error) {
      console.error("capture upload preparation failed", error)
      setErrorMessage("Something went wrong while preparing the upload. Please try again in a moment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Upload capture image">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload capture images</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor={fileInputId}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-muted/40 px-6 py-8 text-center text-sm text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5"
            >
              <UploadCloud className="size-6 text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Drag or click to select multiple images.</p>
                <p className="text-xs text-muted-foreground/80">Supports PNG, JPG, SVG, and other image files.</p>
              </div>
            </label>
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {Boolean(selectedFiles.length) && (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Selected files {selectedFiles.length}
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {selectedFiles.map(({ file, previewUrl }) => (
                  <div
                    key={previewUrl}
                    className="flex items-center gap-3 rounded-md border border-border/50 bg-background p-2"
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-sm bg-muted/30">
                      <Image
                        src={previewUrl}
                        alt={`${file.name} preview`}
                        fill
                        sizes="64px"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col text-xs">
                      <p className="truncate font-medium text-foreground">{file.name}</p>
                      <p className="text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFile(previewUrl)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove {file.name}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedFiles.length || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
