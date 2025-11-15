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
import { useWorkspaceData } from "@/lib/workspace-data-context"
import { usePatternDetail } from "@/lib/hooks/use-pattern-detail"

type RightWorkspaceProps = {
  patternId?: string
}

export function RightWorkspace({ patternId }: RightWorkspaceProps) {
  const { patterns, tags, loading: workspaceLoading, error: workspaceError, mutations, refresh: refreshWorkspace } = useWorkspaceData()

  const resolvedPatternId = React.useMemo(
    () => patternId ?? patterns[0]?.id,
    [patternId, patterns]
  )

  const pattern = React.useMemo(
    () => patterns.find((item) => item.id === resolvedPatternId),
    [patterns, resolvedPatternId]
  )

  const {
    captures: captureList,
    insights: insightList,
    loading: detailLoading,
    error: detailError,
    uploadCapture: uploadCaptureAction,
    reorderCaptures: reorderCapturesAction,
    deleteCapture: deleteCaptureAction,
    createInsight: createInsightAction,
    updateInsight: updateInsightAction,
    deleteInsight: deleteInsightAction,
  } = usePatternDetail(pattern?.id)

  const patternCaptures = React.useMemo(() => {
    return [...captureList].sort((a, b) => a.order - b.order)
  }, [captureList])

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
    return insightList
      .filter((insight) => insight.captureId === activeCapture.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [insightList, activeCapture])

  const [highlightedInsightId, setHighlightedInsightId] = React.useState<string | null>(null)
  const [isPlacingInsight, setIsPlacingInsight] = React.useState(false)
  const [pendingInsightDeleteId, setPendingInsightDeleteId] = React.useState<string | null>(null)

  const insightDeleteTarget = React.useMemo(() => {
    if (!pendingInsightDeleteId) return null
    return insightList.find((insight) => insight.id === pendingInsightDeleteId) ?? null
  }, [insightList, pendingInsightDeleteId])

  React.useEffect(() => {
    setIsPlacingInsight(false)
  }, [activeCapture?.id])

  const isAddingInsight = isPlacingInsight

  const handleToggleAddMode = React.useCallback(() => {
    if (!activeCapture) return
    setIsPlacingInsight((prev) => !prev)
  }, [activeCapture])

  const handleCanvasPlacement = React.useCallback(
    async (point: CanvasPoint) => {
      if (!activeCapture) return
      try {
        const created = await createInsightAction({ captureId: activeCapture.id, x: point.x, y: point.y, note: "" })
        setHighlightedInsightId(created.id)
        setIsPlacingInsight(false)
      } catch (mutationError) {
        console.error("인사이트 생성 실패", mutationError)
      }
    },
    [activeCapture, createInsightAction]
  )

  const handleUpdateInsightPosition = React.useCallback(
    async (insightId: string, point: CanvasPoint) => {
      if (!activeCapture) return
      try {
        await updateInsightAction({ captureId: activeCapture.id, insightId, x: point.x, y: point.y })
      } catch (mutationError) {
        console.error("인사이트 위치 업데이트 실패", mutationError)
      }
    },
    [activeCapture, updateInsightAction]
  )

  const handleDeleteInsight = React.useCallback((insightId: string) => {
    setPendingInsightDeleteId(insightId)
  }, [])

  const handleConfirmDeleteInsight = React.useCallback(async () => {
    if (!pendingInsightDeleteId || !insightDeleteTarget) return
    try {
      await deleteInsightAction({ captureId: insightDeleteTarget.captureId, insightId: pendingInsightDeleteId })
      setHighlightedInsightId((current) => (current === pendingInsightDeleteId ? null : current))
      setPendingInsightDeleteId(null)
    } catch (mutationError) {
      console.error("인사이트 삭제 실패", mutationError)
    }
  }, [deleteInsightAction, insightDeleteTarget, pendingInsightDeleteId])

  const handleUpdateInsightNote = React.useCallback(
    async (insightId: string, note: string) => {
      if (!activeCapture) return
      try {
        await updateInsightAction({ captureId: activeCapture.id, insightId, note })
      } catch (mutationError) {
        console.error("인사이트 메모 업데이트 실패", mutationError)
      }
    },
    [activeCapture, updateInsightAction]
  )

  const handleCancelDeleteInsight = React.useCallback(() => {
    setPendingInsightDeleteId(null)
  }, [])

  const handleUploadCapture = React.useCallback(
    async ({ file, order }: CaptureUploadPayload) => {
      if (!pattern) return
      try {
        const captureId = await uploadCaptureAction({ file, desiredOrder: order })
        setActiveCaptureId(captureId)
        await refreshWorkspace()
      } catch (mutationError) {
        console.error("캡처 업로드 실패", mutationError)
      }
    },
    [pattern, refreshWorkspace, uploadCaptureAction]
  )

  const handleReorderCapture = React.useCallback(
    async (sourceId: string, targetId: string, position: "before" | "after") => {
      if (!pattern || sourceId === targetId) return
      const ordered = [...patternCaptures]
      const fromIndex = ordered.findIndex((capture) => capture.id === sourceId)
      const targetIndex = ordered.findIndex((capture) => capture.id === targetId)
      if (fromIndex === -1 || targetIndex === -1) return

      let destinationIndex = targetIndex + (position === "after" ? 1 : 0)
      if (fromIndex < destinationIndex) {
        destinationIndex -= 1
      }

      const updated = [...ordered]
      const [moved] = updated.splice(fromIndex, 1)
      if (!moved) return
      updated.splice(destinationIndex, 0, moved)

      try {
        await reorderCapturesAction(updated)
        setActiveCaptureId(moved.id)
      } catch (mutationError) {
        console.error("캡처 순서 변경 실패", mutationError)
      }
    },
    [pattern, patternCaptures, reorderCapturesAction]
  )

  const handleDeleteCapture = React.useCallback(
    async (captureId: string) => {
      if (!pattern) return
      try {
        await deleteCaptureAction(captureId)
        await refreshWorkspace()
        setActiveCaptureId((current) => {
          if (current === captureId) {
            return patternCaptures.find((capture) => capture.id !== captureId)?.id
          }
          return current
        })
      } catch (mutationError) {
        console.error("캡처 삭제 실패", mutationError)
      }
    },
    [deleteCaptureAction, pattern, patternCaptures, refreshWorkspace]
  )

  if (workspaceLoading || detailLoading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed">
        패턴 데이터를 불러오는 중입니다...
      </div>
    )
  }

  if (workspaceError || detailError) {
    return (
      <div className="text-destructive flex flex-1 items-center justify-center rounded-md border border-dashed">
        {workspaceError ?? detailError}
      </div>
    )
  }

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
          <PatternMetadataCard
            pattern={pattern}
            allTags={tags}
            onUpdatePattern={(updates) => mutations.updatePattern(pattern.id, updates)}
            onAssignTag={(tagId) => mutations.assignTagToPattern(pattern.id, tagId)}
            onRemoveTag={(tagId) => mutations.removeTagFromPattern(pattern.id, tagId)}
            onToggleFavorite={(next) => mutations.setPatternFavorite(pattern.id, next)}
          />
          <InsightsPanel
            pattern={pattern}
            insights={captureInsights}
            highlightedInsightId={highlightedInsightId}
            onHighlight={setHighlightedInsightId}
            onDeleteInsight={handleDeleteInsight}
            onUpdateInsightNote={handleUpdateInsightNote}
            onUpdatePatternSummary={(summary) => mutations.updatePattern(pattern.id, { summary })}
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
