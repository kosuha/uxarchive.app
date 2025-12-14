"use client"

import * as React from "react"

import { useToast } from "@/components/ui/use-toast"
import { downloadRemoteImage, downloadZipFromUrls, sanitizeFilename } from "@/lib/downloads"
import type { Capture, Insight } from "@/lib/types"

import { CanvasHeader } from "./canvas/canvas-header"
import { CaptureCanvas } from "./canvas/capture-canvas"
import { CaptureStrip } from "./canvas/capture-strip"
import type { CaptureReorderPosition, CaptureUploadPayload } from "./canvas/types"
import { usePrefetchCaptureImages } from "./canvas/use-capture-image-cache"
import type { CanvasPoint } from "./shared"

type CanvasSectionProps = {
  activeCapture?: Capture
  activeCaptureId?: string
  captureInsights: Insight[]
  captureOrder: number
  captures: Capture[]
  allInsights?: Insight[]
  allowDownloads?: boolean | null
  highlightedInsightId: string | null
  isAddingInsight: boolean
  isPlacingInsight: boolean
  patternName?: string
  readOnly?: boolean
  shareButton?: React.ReactNode
  patternLimitMessage?: string | null
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

export type { CaptureUploadPayload }

export function CanvasSection({
  activeCapture,
  activeCaptureId,
  captureInsights,
  captureOrder,
  captures,
  allInsights,
  allowDownloads,
  highlightedInsightId,
  isAddingInsight,
  isPlacingInsight,
  patternName,
  readOnly,
  shareButton,
  patternLimitMessage,
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
  const [downloadsBlocked, setDownloadsBlocked] = React.useState(false)
  const [isCaptureDownloadPending, setCaptureDownloadPending] = React.useState(false)
  const [isPatternDownloadPending, setPatternDownloadPending] = React.useState(false)
  const patternFilenameToken = React.useMemo(() => sanitizeFilename(patternName ?? "pattern"), [patternName])
  const hasDownloadablePattern = React.useMemo(
    () => captures.some((item) => Boolean(item.downloadUrl ?? item.imageUrl)),
    [captures]
  )

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
      const isInCaptureStrip = target?.closest("[data-capture-strip]")
      if (!isInCaptureStrip && target && (interactiveTags.includes(target.tagName) || target.isContentEditable)) {
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

  const isForbiddenError = React.useCallback((error: unknown) => {
    if (!error) return false
    if (typeof error === "object" && "status" in (error as { status?: unknown })) {
      return (error as { status?: unknown }).status === 403
    }
    return error instanceof Error && /\(403\)/.test(error.message)
  }, [])

  const showDownloadBlockedToast = React.useCallback(() => {
    toast({
      variant: "destructive",
      title: "Downloads are restricted",
      description: "Image downloads aren't available on your current plan.",
    })
  }, [toast])

  const showPlanLoadingToast = React.useCallback(() => {
    toast({
      title: "Checking your plan",
      description: "Please try again in a moment.",
    })
  }, [toast])

  const isPlanLoading = allowDownloads == null

  const handleDownloadActiveCapture = React.useCallback(async () => {
    const downloadUrl = activeCapture?.downloadUrl ?? activeCapture?.imageUrl
    if (!downloadUrl) return
    if (isPlanLoading) {
      showPlanLoadingToast()
      return
    }
    if (downloadsBlocked || allowDownloads === false) {
      showDownloadBlockedToast()
      return
    }
    setCaptureDownloadPending(true)
    const orderSource = captureOrder > 0 ? captureOrder : activeCapture?.order ?? 1
    const orderLabel = String(orderSource).padStart(2, "0")
    const baseFilename = `${patternFilenameToken}-capture-${orderLabel}`
    try {
      await downloadRemoteImage(downloadUrl, baseFilename)
      toast({ title: "Preparing download", description: "Saving the current capture image." })
    } catch (error) {
      console.error("Failed to download capture image", error)
      if (isForbiddenError(error)) {
        showDownloadBlockedToast()
        setDownloadsBlocked(true)
      } else {
        toast({
          variant: "destructive",
          title: "Failed to download capture image",
          description: error instanceof Error ? error.message : "Please try again.",
        })
      }
    } finally {
      setCaptureDownloadPending(false)
    }
  }, [
    activeCapture,
    allowDownloads,
    captureOrder,
    downloadsBlocked,
    isForbiddenError,
    isPlanLoading,
    patternFilenameToken,
    showDownloadBlockedToast,
    showPlanLoadingToast,
    toast,
  ])

  const handleDownloadPatternImages = React.useCallback(async () => {
    if (!hasDownloadablePattern) return
    if (isPlanLoading) {
      showPlanLoadingToast()
      return
    }
    if (downloadsBlocked || allowDownloads === false) {
      showDownloadBlockedToast()
      return
    }
    setPatternDownloadPending(true)
    try {
      const zipEntries = captures
        .filter((item) => Boolean(item.downloadUrl ?? item.imageUrl))
        .map((item, index) => ({
          url: item.downloadUrl ?? item.imageUrl,
          filename: `${patternFilenameToken}-capture-${String(index + 1).padStart(2, "0")}`,
        }))
      if (!zipEntries.length) {
        throw new Error("No downloadable images available.")
      }
      await downloadZipFromUrls(zipEntries, `${patternFilenameToken}-captures`)
      toast({ title: "Preparing ZIP", description: "Downloading all capture images as a ZIP." })
    } catch (error) {
      console.error("Failed to download pattern images", error)
      if (isForbiddenError(error)) {
        showDownloadBlockedToast()
        setDownloadsBlocked(true)
      } else {
        toast({
          variant: "destructive",
          title: "Failed to download all pattern images",
          description: error instanceof Error ? error.message : "Please try again.",
        })
      }
    } finally {
      setPatternDownloadPending(false)
    }
  }, [
    allowDownloads,
    captures,
    downloadsBlocked,
    hasDownloadablePattern,
    isForbiddenError,
    isPlanLoading,
    patternFilenameToken,
    showDownloadBlockedToast,
    showPlanLoadingToast,
    toast,
  ])

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
        allInsights={allInsights}
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
        uploadDisabledReason={patternLimitMessage}
      />
    </section>
  )
}
