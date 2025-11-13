"use client"

import * as React from "react"

import { CanvasSection, type CaptureUploadPayload } from "@/components/right-workspace/canvas-section"
import { InsightsPanel } from "@/components/right-workspace/insights-panel"
import { PatternMetadataCard } from "@/components/right-workspace/pattern-metadata-card"
import type { CanvasPoint } from "@/components/right-workspace/shared"
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
import { storageService } from "@/lib/storage"
import type { Capture, Insight } from "@/lib/types"
import { useStorageCollections } from "@/lib/use-storage-collections"

type RightWorkspaceProps = {
  patternId?: string
}

const generateInsightId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `insight-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const generateCaptureId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `capture-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const SMALL_FILE_THRESHOLD = 200 * 1024 // 200KB
const MAX_CAPTURE_DIMENSION = 1600
const JPEG_QUALITY = 0.82

const readFileAsDataUrl = async (file: File): Promise<string> => {
  if (!shouldCompressFile(file)) {
    return readBlobAsDataUrl(file)
  }
  try {
    return await compressImageFile(file)
  } catch (error) {
    console.warn("[capture] 이미지 압축에 실패하여 원본 데이터를 사용합니다.", error)
    return readBlobAsDataUrl(file)
  }
}

const shouldCompressFile = (file: File) => {
  if (!file.type.startsWith("image/")) return false
  if (file.type === "image/svg+xml") return false
  if (file.type === "image/gif") return file.size > SMALL_FILE_THRESHOLD
  return file.size > SMALL_FILE_THRESHOLD
}

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }
      reject(new Error("이미지 데이터를 변환할 수 없습니다."))
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error("이미지 파일을 읽는 중 오류가 발생했습니다."))
    }
    reader.readAsDataURL(blob)
  })

const compressImageFile = async (file: File) => {
  const image = await loadImageElement(file)
  const longestSide = Math.max(image.width, image.height)
  const scale = longestSide > MAX_CAPTURE_DIMENSION ? MAX_CAPTURE_DIMENSION / longestSide : 1
  const targetWidth = Math.max(1, Math.round(image.width * scale))
  const targetHeight = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("이미지 캔버스를 초기화할 수 없습니다.")
  }
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, targetWidth, targetHeight)
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result)
          return
        }
        reject(new Error("이미지 압축 결과를 생성할 수 없습니다."))
      },
      "image/jpeg",
      JPEG_QUALITY
    )
  })
  return readBlobAsDataUrl(blob)
}

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("이미지 파일을 불러올 수 없습니다."))
    }
    image.src = url
  })

export function RightWorkspace({ patternId }: RightWorkspaceProps) {
  const { patterns, captures, insights, tags } = useStorageCollections()

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
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
  }, [insights, activeCapture])

  const [highlightedInsightId, setHighlightedInsightId] = React.useState<string | null>(null)
  const [isPlacingInsight, setIsPlacingInsight] = React.useState(false)
  const [pendingInsightDeleteId, setPendingInsightDeleteId] = React.useState<string | null>(null)

  const insightDeleteTarget = React.useMemo(() => {
    if (!pendingInsightDeleteId) return null
    return insights.find((insight) => insight.id === pendingInsightDeleteId) ?? null
  }, [insights, pendingInsightDeleteId])

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

  const handleDeleteInsight = React.useCallback((insightId: string) => {
    setPendingInsightDeleteId(insightId)
  }, [])

  const handleConfirmDeleteInsight = React.useCallback(() => {
    if (!pendingInsightDeleteId) return
    storageService.insights.remove(pendingInsightDeleteId)
    setHighlightedInsightId((current) => (current === pendingInsightDeleteId ? null : current))
    setPendingInsightDeleteId(null)
  }, [pendingInsightDeleteId])

  const handleUpdateInsightNote = React.useCallback((insightId: string, note: string) => {
    storageService.insights.update(insightId, (current) => ({
      ...current,
      note,
    }))
  }, [])

  const handleCancelDeleteInsight = React.useCallback(() => {
    setPendingInsightDeleteId(null)
  }, [])

  const handleUploadCapture = React.useCallback(
    async ({ file, order }: CaptureUploadPayload) => {
      if (!pattern) {
        throw new Error("패턴 정보를 찾을 수 없어 캡처를 추가할 수 없습니다.")
      }
      const imageUrl = await readFileAsDataUrl(file)
      const allCaptures = storageService.captures.getAll()
      const currentPatternCaptures = allCaptures.filter((capture) => capture.patternId === pattern.id)
      const otherCaptures = allCaptures.filter((capture) => capture.patternId !== pattern.id)
      const maxOrder = currentPatternCaptures.length + 1
      const normalizedOrder = Math.min(Math.max(order, 1), maxOrder)

      const adjustedPatternCaptures = currentPatternCaptures.map((capture) => {
        if (capture.order >= normalizedOrder) {
          return { ...capture, order: capture.order + 1 }
        }
        return capture
      })

      const newCapture: Capture = {
        id: generateCaptureId(),
        patternId: pattern.id,
        imageUrl,
        order: normalizedOrder,
        createdAt: new Date().toISOString(),
      }

      storageService.captures.setAll([...otherCaptures, ...adjustedPatternCaptures, newCapture])
      storageService.patterns.update(pattern.id, (current) => ({
        ...current,
        captureCount: (current.captureCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      }))
      setActiveCaptureId(newCapture.id)
    },
    [pattern, setActiveCaptureId]
  )

  const handleReorderCapture = React.useCallback(
    (sourceId: string, targetId: string, position: "before" | "after") => {
      if (!pattern || sourceId === targetId) return
      const allCaptures = storageService.captures.getAll()
      const patternCaptures = allCaptures
        .filter((capture) => capture.patternId === pattern.id)
        .sort((a, b) => a.order - b.order)

      const fromIndex = patternCaptures.findIndex((capture) => capture.id === sourceId)
      const targetIndex = patternCaptures.findIndex((capture) => capture.id === targetId)
      if (fromIndex === -1 || targetIndex === -1) return

      let destinationIndex = targetIndex + (position === "after" ? 1 : 0)
      if (fromIndex < destinationIndex) {
        destinationIndex -= 1
      }

      const reordered = [...patternCaptures]
      const [moved] = reordered.splice(fromIndex, 1)
      if (!moved) return
      reordered.splice(destinationIndex, 0, moved)

      const normalized = reordered.map((capture, index) => ({
        ...capture,
        order: index + 1,
      }))
      const otherCaptures = allCaptures.filter((capture) => capture.patternId !== pattern.id)
      storageService.captures.setAll([...otherCaptures, ...normalized])
      setActiveCaptureId(moved.id)
    },
    [pattern]
  )

  const handleDeleteCapture = React.useCallback(
    (captureId: string) => {
      if (!pattern) return
      const allCaptures = storageService.captures.getAll()
      const captureToDelete = allCaptures.find(
        (capture) => capture.id === captureId && capture.patternId === pattern.id
      )
      if (!captureToDelete) return

      const remainingPatternCaptures = allCaptures
        .filter((capture) => capture.patternId === pattern.id && capture.id !== captureId)
        .sort((a, b) => a.order - b.order)
        .map((capture, index) => ({ ...capture, order: index + 1 }))
      const otherCaptures = allCaptures.filter((capture) => capture.patternId !== pattern.id)

      storageService.captures.setAll([...otherCaptures, ...remainingPatternCaptures])

      const relatedInsights = storageService.insights
        .getAll()
        .filter((insight) => insight.captureId === captureId)
      relatedInsights.forEach((insight) => storageService.insights.remove(insight.id))

      storageService.patterns.update(pattern.id, (current) => ({
        ...current,
        captureCount: Math.max((current.captureCount ?? 1) - 1, 0),
        updatedAt: new Date().toISOString(),
      }))

      setActiveCaptureId((current) => {
        if (current === captureId) {
          return remainingPatternCaptures[0]?.id
        }
        return current
      })
    },
    [pattern]
  )

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
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-1 basis-0 gap-4 overflow-hidden">
        <CanvasSection
          activeCapture={activeCapture}
          activeCaptureId={activeCaptureId}
          captureInsights={captureInsights}
          captureOrder={captureIndex}
          captures={patternCaptures}
          highlightedInsightId={highlightedInsightId}
          isAddingInsight={isAddingInsight}
          isPlacingInsight={isPlacingInsight}
          onCanvasPlace={handleCanvasPlacement}
          onDeleteInsight={handleDeleteInsight}
          onHighlight={setHighlightedInsightId}
          onSelectCapture={(id) => setActiveCaptureId(id)}
          onToggleAddMode={handleToggleAddMode}
          onUpdateInsightPosition={handleUpdateInsightPosition}
          onUploadCapture={handleUploadCapture}
          onReorderCapture={handleReorderCapture}
          onDeleteCapture={handleDeleteCapture}
        />
        <aside className="flex h-full w-full max-w-[360px] flex-1 basis-0 min-h-0 flex-col gap-4 overflow-hidden">
          <PatternMetadataCard pattern={pattern} allTags={tags} />
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
      <AlertDialog
        open={Boolean(pendingInsightDeleteId)}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelDeleteInsight()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>인사이트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제하면 복구할 수 없습니다.
              {insightDeleteTarget?.note ? (
                <span className="mt-2 block truncate text-muted-foreground">
                  {`"${insightDeleteTarget.note}"`}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteInsight}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteInsight}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
