"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createInsightAction,
  deleteInsightAction,
  getPatternDetailAction,
  updateCaptureOrderAction,
  updateInsightAction,
  type PatternInsightRow,
} from "@/app/actions/pattern-detail"
import type { CaptureRecord } from "@/lib/repositories/captures"
import type { Capture, Insight } from "@/lib/types"
import { measureImageDimensions, optimizeCaptureFile } from "@/lib/utils/capture-optimizer"
import { useWorkspaceData } from "@/lib/workspace-data-context"

type UploadCaptureInput = {
  file: File
  desiredOrder: number
}

type PatternDetailQueryData = {
  captures: Capture[]
  insights: Insight[]
}

type InsightRow = PatternInsightRow

const PATTERN_DETAIL_QUERY_KEY = "pattern-detail"

const createEmptyDetailData = (): PatternDetailQueryData => ({ captures: [], insights: [] })

const STORAGE_OBJECT_ROUTE = "/api/storage/object"

const normalizeObjectPath = (path: string) => path.replace(/^\/+/, "").trim()

const buildStorageProxyUrl = (() => {
  const bucketParam = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim()
  return (path: string, mode: "view" | "download" = "view") => {
    const params = new URLSearchParams()
    params.set("path", normalizeObjectPath(path))
    if (bucketParam) {
      params.set("bucket", bucketParam)
    }
    params.set("mode", mode)
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
    const proxyUrl = buildStorageProxyUrl(storagePath, "view")
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

const resolveCaptureDownloadUrl = (record: CaptureRecord) => {
  const storagePath = record.storagePath?.trim()
  if (storagePath) {
    if (isAbsoluteUrl(storagePath)) {
      return storagePath
    }
    return buildStorageProxyUrl(storagePath, "download")
  }

  const publicUrl = record.publicUrl?.trim()
  if (publicUrl) {
    if (isAbsoluteUrl(publicUrl)) {
      return publicUrl
    }
    return `/${publicUrl}`
  }

  return ""
}

export const usePatternDetail = (patternId?: string | null) => {
  const { workspaceId } = useWorkspaceData()
  const queryClient = useQueryClient()
  const insightMutationVersionsRef = React.useRef<Map<string, number>>(new Map()) // prevent stale marker updates
  const pendingCaptureOrderRef = React.useRef<string[] | null>(null)
  const pendingUploadCountRef = React.useRef(0)
  const pendingDeletionCountRef = React.useRef(0)

  const mapCaptureRecord = React.useCallback((record: CaptureRecord) => {
    return {
      id: record.id,
      patternId: record.patternId,
      imageUrl: resolveCaptureImageUrl(record),
      downloadUrl: resolveCaptureDownloadUrl(record),
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

      const data = await getPatternDetailAction(patternId)
      const captureRecords = data.captures
      const mappedCaptures = captureRecords
        .map((record) => mapCaptureRecord(record))
        .sort((a, b) => a.order - b.order)

      const insightRows: InsightRow[] = data.insights ?? []

      const mappedInsights: Insight[] = insightRows.map((row) => ({
        id: row.id,
        captureId: row.capture_id,
        x: Number(row.x),
        y: Number(row.y),
        note: row.note ?? "",
        createdAt: row.created_at,
        clientId: row.id,
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

  const getCachedCaptureOrder = React.useCallback(() => {
    if (!patternDetailQueryKey) {
      return []
    }
    const cached = queryClient.getQueryData<PatternDetailQueryData>(patternDetailQueryKey)
    if (!cached) {
      return []
    }
    return cached.captures.map((capture) => capture.id)
  }, [patternDetailQueryKey, queryClient])

  const persistCaptureOrder = React.useCallback(
    async (orderedIds: string[], overridePatternId?: string) => {
      const targetPatternId = overridePatternId ?? patternId
      if (!targetPatternId || !orderedIds.length) {
        return
      }

      await updateCaptureOrderAction({ patternId: targetPatternId, orderedIds })
    },
    [patternId],
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
    width?: number
    height?: number
  }

  type UploadCaptureMutationContext = {
    previousData?: PatternDetailQueryData
    previewUrl?: string
  }

  const uploadCaptureMutation = useMutation<CaptureRecord, Error, UploadCaptureMutationVariables, UploadCaptureMutationContext>({
    mutationFn: async (variables) => {
      const { file, captureId, workspaceId: targetWorkspaceId, patternId: targetPatternId } = variables

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
        throw new Error(payload?.error ?? "Failed to prepare capture upload.")
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
        throw new Error("Failed to upload capture file.")
      }

      const dimensionSource =
        typeof variables.width === "number" || typeof variables.height === "number"
          ? { width: variables.width, height: variables.height }
          : await measureImageDimensions(file)
      const width = typeof dimensionSource.width === "number" ? dimensionSource.width : undefined
      const height = typeof dimensionSource.height === "number" ? dimensionSource.height : undefined

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
        throw new Error(finalizePayload?.error ?? "Failed to update capture information.")
      }

      const finalizePayload = (await finalizeResponse.json()) as { capture: CaptureRecord }
      return finalizePayload.capture
    },
    onMutate: async (variables) => {
      if (!patternDetailQueryKey) {
        return {}
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
        throw new Error("Workspace or pattern information is missing.")
      }

      if (!patternDetailQueryKey) {
        throw new Error("Unable to find pattern details.")
      }

      const captureId = globalThis.crypto?.randomUUID?.() ?? `capture-${Date.now()}`
      const cachedOrder = getCachedCaptureOrder()
      const currentIds = pendingCaptureOrderRef.current ?? cachedOrder
      const normalizedOrder = Math.min(Math.max(desiredOrder, 1), currentIds.length + 1)
      const orderedIds = [...currentIds]
      orderedIds.splice(normalizedOrder - 1, 0, captureId)
      pendingCaptureOrderRef.current = orderedIds
      pendingUploadCountRef.current += 1

      let optimizedFile = file
      let optimizedWidth: number | undefined
      let optimizedHeight: number | undefined
      try {
        const optimization = await optimizeCaptureFile(file)
        optimizedFile = optimization.file
        optimizedWidth = optimization.width
        optimizedHeight = optimization.height
      } catch (error) {
        console.warn("[usePatternDetail] capture optimization failed, using original file", error)
      }

      try {
        await uploadCaptureMutation.mutateAsync({
          file: optimizedFile,
          desiredOrder: normalizedOrder,
          captureId,
          patternId,
          workspaceId,
          orderedIds,
          width: optimizedWidth,
          height: optimizedHeight,
        })
      } finally {
        pendingUploadCountRef.current = Math.max(0, pendingUploadCountRef.current - 1)
        if (pendingUploadCountRef.current === 0) {
          const finalOrder = pendingCaptureOrderRef.current ?? getCachedCaptureOrder()
          if (finalOrder.length) {
            try {
              await persistCaptureOrder(finalOrder)
            } catch (orderError) {
              console.warn("[usePatternDetail] failed to persist capture order after uploads", orderError)
            }
          }
          pendingCaptureOrderRef.current = null
        } else {
          const snapshot = getCachedCaptureOrder()
          pendingCaptureOrderRef.current = snapshot.length ? snapshot : pendingCaptureOrderRef.current
        }
      }

      return captureId
    },
    [getCachedCaptureOrder, patternDetailQueryKey, patternId, persistCaptureOrder, uploadCaptureMutation, workspaceId],
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
      const nextOrderedIds = getCachedCaptureOrder().filter((id) => id !== captureId)
      pendingDeletionCountRef.current += 1
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

      try {
        const response = await fetch("/api/captures/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, patternId, captureId }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          await refresh({ silent: true })
          throw new Error(payload?.error ?? "Failed to delete capture.")
        }

        if (nextOrderedIds.length > 0) {
          await persistCaptureOrder(nextOrderedIds)
        }
      } finally {
        pendingDeletionCountRef.current = Math.max(0, pendingDeletionCountRef.current - 1)
        if (pendingDeletionCountRef.current === 0 && patternDetailQueryKey) {
          await queryClient.invalidateQueries({ queryKey: patternDetailQueryKey })
        }
      }
    },
    [getCachedCaptureOrder, patternDetailQueryKey, patternId, persistCaptureOrder, queryClient, refresh, setDetailData, workspaceId],
  )

  const createInsight = React.useCallback(
    async (input: { captureId: string; x: number; y: number; note?: string }) => {
      if (!patternId) {
        throw new Error("Pattern information is missing.")
      }
      const tempId = globalThis.crypto?.randomUUID?.() ?? `temp-insight-${Date.now()}`
      const tempInsight: Insight = {
        id: tempId,
        captureId: input.captureId,
        x: input.x,
        y: input.y,
        note: input.note ?? "",
        createdAt: new Date().toISOString(),
        clientId: tempId,
      }

      setDetailData((current) => ({
        captures: current.captures,
        insights: [...current.insights, tempInsight],
      }))

      try {
        const record = await createInsightAction({
          patternId,
          captureId: input.captureId,
          x: input.x,
          y: input.y,
          note: input.note ?? "",
        })
        const created: Insight = {
          id: record.id,
          captureId: record.captureId,
          x: record.x,
          y: record.y,
          note: record.note,
          createdAt: record.createdAt,
          clientId: tempInsight.clientId ?? tempId,
        }
        setDetailData((current) => ({
          captures: current.captures,
          insights: current.insights.map((insight) =>
            insight.id === tempId
              ? {
                  ...created,
                  clientId: insight.clientId ?? tempInsight.clientId ?? tempId,
                }
              : insight,
          ),
        }))
        return created
      } catch (error) {
        setDetailData((current) => ({
          captures: current.captures,
          insights: current.insights.filter((insight) => insight.id !== tempId),
        }))
        throw error
      }
    },
    [patternId, setDetailData],
  )

  const updateInsight = React.useCallback(
    async (input: { captureId: string; insightId: string; x?: number; y?: number; note?: string }) => {
      if (!patternId) {
        throw new Error("Pattern information is missing.")
      }
      const mutationVersion = (insightMutationVersionsRef.current.get(input.insightId) ?? 0) + 1
      insightMutationVersionsRef.current.set(input.insightId, mutationVersion)
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

      try {
        const record = await updateInsightAction({
          patternId,
          captureId: input.captureId,
          insightId: input.insightId,
          x: input.x,
          y: input.y,
          note: input.note,
        })

        const latestVersion = insightMutationVersionsRef.current.get(record.id)
        if (typeof latestVersion === "number" && mutationVersion !== latestVersion) {
          return
        }

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
                  clientId: insight.clientId ?? record.id,
                }
              : insight,
          ),
        }))
      } catch (error) {
        await refresh({ silent: true })
        throw error
      }
    },
    [patternId, refresh, setDetailData],
  )

  const deleteInsight = React.useCallback(
    async (input: { captureId: string; insightId: string }) => {
      if (!patternId) {
        throw new Error("Pattern information is missing.")
      }
      setDetailData((current) => ({
        captures: current.captures,
        insights: current.insights.filter((insight) => insight.id !== input.insightId),
      }))

      try {
        await deleteInsightAction({ patternId, captureId: input.captureId, insightId: input.insightId })
      } catch (error) {
        await refresh({ silent: true })
        throw error
      }
    },
    [patternId, refresh, setDetailData],
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
