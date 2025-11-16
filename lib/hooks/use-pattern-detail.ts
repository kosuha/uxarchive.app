"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

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

type PatternDetailQueryData = {
  captures: Capture[]
  insights: Insight[]
}

type InsightRow = {
  id: string
  capture_id: string
  x: number
  y: number
  note: string
  created_at: string
}

const PATTERN_DETAIL_QUERY_KEY = "pattern-detail"

const createEmptyDetailData = (): PatternDetailQueryData => ({ captures: [], insights: [] })

const STORAGE_OBJECT_ROUTE = "/api/storage/object"

const normalizeObjectPath = (path: string) => path.replace(/^\/+/, "").trim()

const buildStorageProxyUrl = (() => {
  const bucketParam = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim()
  return (path: string) => {
    const params = new URLSearchParams()
    params.set("path", normalizeObjectPath(path))
    if (bucketParam) {
      params.set("bucket", bucketParam)
    }
    return `${STORAGE_OBJECT_ROUTE}?${params.toString()}`
  }
})()

const isAbsoluteUrl = (value: string | null | undefined) => {
  if (!value || typeof value !== "string") return false
  try {
    const parsed = new URL(value)
    return Boolean(parsed.protocol && parsed.host)
  } catch {
    return false
  }
}

const resolveCaptureImageUrl = (record: CaptureRecord) => {
  const storagePath = record.storagePath?.trim()
  if (storagePath) {
    if (isAbsoluteUrl(storagePath)) {
      return storagePath
    }
    const proxyUrl = buildStorageProxyUrl(storagePath)
    if (process.env.NODE_ENV === "development") {
      console.log("[usePatternDetail] capture storage proxy url", {
        captureId: record.id,
        storagePath: record.storagePath,
        proxyUrl,
      })
    }
    return proxyUrl
  }

  const publicUrl = record.publicUrl?.trim()
  if (publicUrl) {
    if (isAbsoluteUrl(publicUrl)) {
      return publicUrl
    }
    return `/${publicUrl}`
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("[usePatternDetail] capture image url fallback", {
      captureId: record.id,
      storagePath: record.storagePath,
      publicUrl: record.publicUrl,
    })
  }

  return ""
}

export const usePatternDetail = (patternId?: string | null) => {
  const { supabase } = useSupabaseSession()
  const { workspaceId } = useWorkspaceData()
  const queryClient = useQueryClient()

  const mapCaptureRecord = React.useCallback((record: CaptureRecord) => {
    return {
      id: record.id,
      patternId: record.patternId,
      imageUrl: resolveCaptureImageUrl(record),
      order: record.orderIndex ?? 0,
      createdAt: record.createdAt,
    } satisfies Capture
  }, [])

  const patternDetailQueryKey = React.useMemo(() => (patternId ? [PATTERN_DETAIL_QUERY_KEY, patternId] : null), [patternId])

  const detailQuery = useQuery<PatternDetailQueryData>({
    queryKey: patternDetailQueryKey ?? [PATTERN_DETAIL_QUERY_KEY, "unknown"],
    queryFn: async () => {
      if (!patternId) {
        return createEmptyDetailData()
      }

      const capturesRepo = createCapturesRepository(supabase)
      const captureRecords = await capturesRepo.listByPattern({ patternId })
      const mappedCaptures = captureRecords
        .map((record) => mapCaptureRecord(record))
        .sort((a, b) => a.order - b.order)

      let insightRows: InsightRow[] = []
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
        insightRows = (data as InsightRow[]) ?? []
      }

      const mappedInsights: Insight[] = insightRows.map((row) => ({
        id: row.id,
        captureId: row.capture_id,
        x: Number(row.x),
        y: Number(row.y),
        note: row.note ?? "",
        createdAt: row.created_at,
      }))

      return {
        captures: mappedCaptures,
        insights: mappedInsights,
      }
    },
    enabled: Boolean(patternId),
  })

  type RefreshOptions = { silent?: boolean }

  const refresh = React.useCallback(
    async (options?: RefreshOptions) => {
      if (!patternDetailQueryKey) {
        return
      }

      if (options?.silent) {
        await queryClient.invalidateQueries({ queryKey: patternDetailQueryKey })
        return
      }

      await detailQuery.refetch()
    },
    [detailQuery, patternDetailQueryKey, queryClient],
  )

  const setDetailData = React.useCallback(
    (updater: (data: PatternDetailQueryData) => PatternDetailQueryData) => {
      if (!patternDetailQueryKey) {
        return
      }
      queryClient.setQueryData<PatternDetailQueryData>(patternDetailQueryKey, (previous) => {
        const base = previous ? { captures: [...previous.captures], insights: [...previous.insights] } : createEmptyDetailData()
        return updater(base)
      })
    },
    [patternDetailQueryKey, queryClient],
  )

  const persistCaptureOrder = React.useCallback(
    async (orderedIds: string[], overridePatternId?: string) => {
      const targetPatternId = overridePatternId ?? patternId
      if (!targetPatternId || !orderedIds.length) {
        return
      }

      for (const [index, captureId] of orderedIds.entries()) {
        await supabase
          .from("captures")
          .update({ order_index: index + 1 })
          .eq("pattern_id", targetPatternId)
          .eq("id", captureId)
      }
    },
    [patternId, supabase],
  )

  const captureOrderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => persistCaptureOrder(orderedIds),
    onMutate: async (orderedIds: string[]) => {
      if (!patternDetailQueryKey || !orderedIds.length) {
        return
      }

      await queryClient.cancelQueries({ queryKey: patternDetailQueryKey })
      const previousData = queryClient.getQueryData<PatternDetailQueryData>(patternDetailQueryKey)
      if (previousData) {
        const captureMap = new Map(previousData.captures.map((capture) => [capture.id, capture]))
        const reorderedCaptures: Capture[] = orderedIds
          .map((id, index) => {
            const match = captureMap.get(id)
            if (!match) return null
            return { ...match, order: index + 1 }
          })
          .filter(Boolean) as Capture[]

        queryClient.setQueryData<PatternDetailQueryData>(patternDetailQueryKey, {
          captures: reorderedCaptures,
          insights: previousData.insights,
        })
      }

      return { previousData }
    },
    onError: (_error, _orderedIds, context) => {
      if (context?.previousData && patternDetailQueryKey) {
        queryClient.setQueryData(patternDetailQueryKey, context.previousData)
      }
    },
    onSettled: () => {
      if (patternDetailQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternDetailQueryKey })
      }
    },
  })

  type UploadCaptureMutationVariables = UploadCaptureInput & {
    captureId: string
    patternId: string
    workspaceId: string
    orderedIds: string[]
  }

  type UploadCaptureMutationContext = {
    previousData?: PatternDetailQueryData
    previewUrl?: string
  }

  const uploadCaptureMutation = useMutation<CaptureRecord, Error, UploadCaptureMutationVariables, UploadCaptureMutationContext>({
    mutationFn: async (variables) => {
      const { file, captureId, workspaceId: targetWorkspaceId, patternId: targetPatternId, orderedIds } = variables

      const filename = file.name || `${captureId}.dat`
      const contentType = file.type || "application/octet-stream"

      const response = await fetch("/api/captures/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: targetWorkspaceId,
          patternId: targetPatternId,
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
          body: JSON.stringify({ workspaceId: targetWorkspaceId, patternId: targetPatternId, captureId }),
        })
        throw new Error("캡처 파일 업로드에 실패했습니다.")
      }

      const { width, height } = await readImageDimensions(file)

      const finalizeResponse = await fetch("/api/captures/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: targetWorkspaceId,
          patternId: targetPatternId,
          captureId,
          width,
          height,
          refreshPublicUrl: true,
        }),
      })

      if (!finalizeResponse.ok) {
        const finalizePayload = await finalizeResponse.json().catch(() => null)
        throw new Error(finalizePayload?.error ?? "캡처 정보를 갱신하지 못했습니다.")
      }

      await persistCaptureOrder(orderedIds, targetPatternId)

      const finalizePayload = (await finalizeResponse.json()) as { capture: CaptureRecord }
      return finalizePayload.capture
    },
    onMutate: async (variables) => {
      if (!patternDetailQueryKey) {
        return
      }

      await queryClient.cancelQueries({ queryKey: patternDetailQueryKey })
      const previousData = queryClient.getQueryData<PatternDetailQueryData>(patternDetailQueryKey)
      const previewUrl = URL.createObjectURL(variables.file)

      const nextCaptures: Capture[] = variables.orderedIds.map((id, index) => {
        if (id === variables.captureId) {
          return {
            id: variables.captureId,
            patternId: variables.patternId,
            imageUrl: previewUrl,
            order: index + 1,
            createdAt: new Date().toISOString(),
          }
        }

        const match = previousData?.captures.find((capture) => capture.id === id)
        if (!match) {
          return {
            id,
            patternId: variables.patternId,
            imageUrl: "",
            order: index + 1,
            createdAt: new Date().toISOString(),
          }
        }
        return { ...match, order: index + 1 }
      })

      queryClient.setQueryData<PatternDetailQueryData>(patternDetailQueryKey, {
        captures: nextCaptures,
        insights: previousData?.insights ?? [],
      })

      return { previousData, previewUrl }
    },
    onError: async (_error, _variables, context) => {
      if (context?.previewUrl) {
        URL.revokeObjectURL(context.previewUrl)
      }
      if (patternDetailQueryKey) {
        if (context?.previousData) {
          queryClient.setQueryData(patternDetailQueryKey, context.previousData)
        } else {
          await queryClient.invalidateQueries({ queryKey: patternDetailQueryKey })
        }
      }
    },
    onSuccess: (record) => {
      if (!patternDetailQueryKey) {
        return
      }

      queryClient.setQueryData<PatternDetailQueryData>(patternDetailQueryKey, (current) => {
        const base = current ?? createEmptyDetailData()
        const mapped = mapCaptureRecord(record)
        const updatedCaptures = base.captures.map((capture) => (capture.id === record.id ? mapped : capture))
        return {
          captures: updatedCaptures,
          insights: base.insights,
        }
      })
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.previewUrl) {
        URL.revokeObjectURL(context.previewUrl)
      }
      if (patternDetailQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternDetailQueryKey })
      }
    },
  })

  const uploadCapture = React.useCallback(
    async ({ file, desiredOrder }: UploadCaptureInput) => {
      if (!patternId || !workspaceId) {
        throw new Error("워크스페이스 또는 패턴 정보가 부족합니다.")
      }

      if (!patternDetailQueryKey) {
        throw new Error("패턴 세부 정보를 찾을 수 없습니다.")
      }

      const captureId = globalThis.crypto?.randomUUID?.() ?? `capture-${Date.now()}`
      const currentData = queryClient.getQueryData<PatternDetailQueryData>(patternDetailQueryKey) ?? createEmptyDetailData()
      const currentIds = currentData.captures.map((capture) => capture.id)
      const normalizedOrder = Math.min(Math.max(desiredOrder, 1), currentIds.length + 1)
      const orderedIds = [...currentIds]
      orderedIds.splice(normalizedOrder - 1, 0, captureId)

      await uploadCaptureMutation.mutateAsync({
        file,
        desiredOrder: normalizedOrder,
        captureId,
        patternId,
        workspaceId,
        orderedIds,
      })

      return captureId
    },
    [patternDetailQueryKey, patternId, queryClient, uploadCaptureMutation, workspaceId],
  )

  const reorderCaptures = React.useCallback(
    async (orderedCaptures: Capture[]) => {
      if (!patternId) return
      const orderedIds = orderedCaptures.map((capture) => capture.id)
      await captureOrderMutation.mutateAsync(orderedIds)
    },
    [captureOrderMutation, patternId],
  )

  const deleteCapture = React.useCallback(
    async (captureId: string) => {
      if (!patternId || !workspaceId) return
      setDetailData((current) => {
        const nextCaptures = current.captures
          .filter((capture) => capture.id !== captureId)
          .map((capture, index) => ({ ...capture, order: index + 1 }))
        const nextInsights = current.insights.filter((insight) => insight.captureId !== captureId)
        return {
          captures: nextCaptures,
          insights: nextInsights,
        }
      })

      const response = await fetch("/api/captures/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, patternId, captureId }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        await refresh({ silent: true })
        throw new Error(payload?.error ?? "캡처를 삭제하지 못했습니다.")
      }

      if (patternDetailQueryKey) {
        await queryClient.invalidateQueries({ queryKey: patternDetailQueryKey })
      }
    },
    [patternDetailQueryKey, patternId, queryClient, refresh, setDetailData, workspaceId],
  )

  const createInsight = React.useCallback(
    async (input: { captureId: string; x: number; y: number; note?: string }) => {
      const repo = createInsightsRepository(supabase)
      const record = await repo.create({ captureId: input.captureId, x: input.x, y: input.y, note: input.note ?? "" })
      const created: Insight = {
        id: record.id,
        captureId: record.captureId,
        x: record.x,
        y: record.y,
        note: record.note,
        createdAt: record.createdAt,
      }
      setDetailData((current) => ({
        captures: current.captures,
        insights: [...current.insights, created],
      }))
      return created
    },
    [setDetailData, supabase],
  )

  const updateInsight = React.useCallback(
    async (input: { captureId: string; insightId: string; x?: number; y?: number; note?: string }) => {
      setDetailData((current) => ({
        captures: current.captures,
        insights: current.insights.map((insight) => {
          if (insight.id !== input.insightId) {
            return insight
          }
          return {
            ...insight,
            x: typeof input.x === "number" ? input.x : insight.x,
            y: typeof input.y === "number" ? input.y : insight.y,
            note: typeof input.note === "string" ? input.note : insight.note,
          }
        }),
      }))

      const repo = createInsightsRepository(supabase)
      try {
        const record = await repo.update({
          captureId: input.captureId,
          insightId: input.insightId,
          x: input.x,
          y: input.y,
          note: input.note,
        })

        setDetailData((current) => ({
          captures: current.captures,
          insights: current.insights.map((insight) =>
            insight.id === record.id
              ? {
                  id: record.id,
                  captureId: record.captureId,
                  x: record.x,
                  y: record.y,
                  note: record.note,
                  createdAt: record.createdAt,
                }
              : insight,
          ),
        }))
      } catch (error) {
        await refresh({ silent: true })
        throw error
      }
    },
    [refresh, setDetailData, supabase],
  )

  const deleteInsight = React.useCallback(
    async (input: { captureId: string; insightId: string }) => {
      const repo = createInsightsRepository(supabase)
      setDetailData((current) => ({
        captures: current.captures,
        insights: current.insights.filter((insight) => insight.id !== input.insightId),
      }))

      try {
        await repo.remove({ captureId: input.captureId, insightId: input.insightId })
      } catch (error) {
        await refresh({ silent: true })
        throw error
      }
    },
    [refresh, setDetailData, supabase],
  )

  const captures = patternId ? detailQuery.data?.captures ?? [] : []
  const insights = patternId ? detailQuery.data?.insights ?? [] : []
  const loading = Boolean(patternId) ? detailQuery.isPending : false
  const error = detailQuery.error ? (detailQuery.error instanceof Error ? detailQuery.error.message : String(detailQuery.error)) : null

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

const readImageDimensions = async (file: File): Promise<{ width?: number; height?: number }> => {
  if (!file.type.startsWith("image/")) {
    return {}
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: Math.round(image.width), height: Math.round(image.height) })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }
    image.src = url
  })
}
