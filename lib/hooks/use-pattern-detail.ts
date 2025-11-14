"use client"

import * as React from "react"

import { createCapturesRepository } from "@/lib/repositories/captures"
import type { CaptureRecord } from "@/lib/repositories/captures"
import { createInsightsRepository } from "@/lib/repositories/insights"
import type { Capture, Insight } from "@/lib/types"
import { useWorkspaceData } from "@/lib/workspace-data-context"
import { useSupabaseSession } from "@/lib/supabase/session-context"

type UploadCaptureInput = {
  file: File
  desiredOrder: number
}

export const usePatternDetail = (patternId?: string | null) => {
  const { supabase } = useSupabaseSession()
  const { workspaceId } = useWorkspaceData()
  const [captures, setCaptures] = React.useState<Capture[]>([])
  const [insights, setInsights] = React.useState<Insight[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const mapCaptureRecord = React.useCallback((record: CaptureRecord) => {
    return {
      id: record.id,
      patternId: record.patternId,
      imageUrl: record.publicUrl ?? record.storagePath,
      order: record.orderIndex ?? 0,
      createdAt: record.createdAt,
    } satisfies Capture
  }, [])

  const refresh = React.useCallback(async () => {
    if (!patternId) {
      setCaptures([])
      setInsights([])
      setError(null)
      return
    }

    setLoading(true)
    try {
      const capturesRepo = createCapturesRepository(supabase)
      const captureRecords = await capturesRepo.listByPattern({ patternId })
      const mappedCaptures = captureRecords
        .map((record) => mapCaptureRecord(record))
        .sort((a, b) => a.order - b.order)
      setCaptures(mappedCaptures)

      let insightRows: Array<{ id: string; capture_id: string; x: number; y: number; note: string; created_at: string }> = []
      if (captureRecords.length) {
        const { data, error } = await supabase
          .from("insights")
          .select("id, capture_id, x, y, note, created_at")
          .in(
            "capture_id",
            captureRecords.map((record) => record.id),
          )
          .order("created_at", { ascending: true })

        if (error) {
          throw new Error(`인사이트를 불러오지 못했습니다: ${error.message}`)
        }
        insightRows = (data as typeof insightRows) ?? []
      }

      setInsights(
        insightRows.map((row) => ({
          id: row.id,
          captureId: row.capture_id,
          x: Number(row.x),
          y: Number(row.y),
          note: row.note ?? "",
          createdAt: row.created_at,
        })),
      )
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "패턴 상세 데이터를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [mapCaptureRecord, patternId, supabase])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const applyCaptureOrder = React.useCallback(
    async (orderedIds: string[]) => {
      if (!patternId || !orderedIds.length) return
      for (const [index, captureId] of orderedIds.entries()) {
        await supabase
          .from("captures")
          .update({ order_index: index + 1 })
          .eq("pattern_id", patternId)
          .eq("id", captureId)
      }
    },
    [patternId, supabase],
  )

  const uploadCapture = React.useCallback(
    async ({ file, desiredOrder }: UploadCaptureInput) => {
      if (!patternId || !workspaceId) {
        throw new Error("워크스페이스 또는 패턴 정보가 부족합니다.")
      }

      const captureId = globalThis.crypto?.randomUUID?.() ?? `capture-${Date.now()}`
      const filename = file.name || `${captureId}.dat`
      const contentType = file.type || "application/octet-stream"

      const response = await fetch("/api/captures/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          patternId,
          captureId,
          filename,
          contentType,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "캡처 업로드 준비에 실패했습니다.")
      }

      const payload = await response.json()
      const uploadResult = await fetch(payload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          Authorization: `Bearer ${payload.token}`,
        },
        body: file,
      })

      if (!uploadResult.ok) {
        await fetch("/api/captures/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, patternId, captureId }),
        })
        throw new Error("캡처 파일 업로드에 실패했습니다.")
      }

      const repo = createCapturesRepository(supabase)
      const captureRecords = await repo.listByPattern({ patternId })
      const orderedIds = captureRecords
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((record) => record.id)
      const currentIndex = orderedIds.indexOf(captureId)
      if (currentIndex !== -1) {
        orderedIds.splice(currentIndex, 1)
        const normalizedOrder = Math.min(Math.max(desiredOrder, 1), orderedIds.length + 1)
        orderedIds.splice(normalizedOrder - 1, 0, captureId)
        await applyCaptureOrder(orderedIds)
      }

      await refresh()
      return captureId
    },
    [applyCaptureOrder, patternId, refresh, supabase, workspaceId],
  )

  const reorderCaptures = React.useCallback(
    async (orderedCaptures: Capture[]) => {
      await applyCaptureOrder(orderedCaptures.map((capture) => capture.id))
      await refresh()
    },
    [applyCaptureOrder, refresh],
  )

  const deleteCapture = React.useCallback(
    async (captureId: string) => {
      if (!patternId || !workspaceId) return
      const response = await fetch("/api/captures/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, patternId, captureId }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "캡처를 삭제하지 못했습니다.")
      }
      await refresh()
    },
    [patternId, refresh, workspaceId],
  )

  const createInsight = React.useCallback(
    async (input: { captureId: string; x: number; y: number; note?: string }) => {
      const repo = createInsightsRepository(supabase)
      const record = await repo.create({ captureId: input.captureId, x: input.x, y: input.y, note: input.note ?? "" })
      await refresh()
      const created: Insight = {
        id: record.id,
        captureId: record.captureId,
        x: record.x,
        y: record.y,
        note: record.note,
        createdAt: record.createdAt,
      }
      return created
    },
    [refresh, supabase],
  )

  const updateInsight = React.useCallback(
    async (input: { captureId: string; insightId: string; x?: number; y?: number; note?: string }) => {
      const repo = createInsightsRepository(supabase)
      await repo.update({
        captureId: input.captureId,
        insightId: input.insightId,
        x: input.x,
        y: input.y,
        note: input.note,
      })
      await refresh()
    },
    [refresh, supabase],
  )

  const deleteInsight = React.useCallback(
    async (input: { captureId: string; insightId: string }) => {
      const repo = createInsightsRepository(supabase)
      await repo.remove({ captureId: input.captureId, insightId: input.insightId })
      await refresh()
    },
    [refresh, supabase],
  )

  return {
    captures,
    insights,
    loading,
    error,
    refresh,
    uploadCapture,
    reorderCaptures,
    deleteCapture,
    createInsight,
    updateInsight,
    deleteInsight,
  }
}
