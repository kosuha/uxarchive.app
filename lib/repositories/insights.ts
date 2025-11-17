import type { SupabaseRepositoryClient } from "./types"
import { RepositoryError } from "./types"
import { ensureData } from "./utils"

const INSIGHT_SELECT_FIELDS = "id, capture_id, author_id, x, y, note, created_at, updated_at"

export type InsightRecord = {
  id: string
  captureId: string
  authorId: string | null
  x: number
  y: number
  note: string
  createdAt: string
  updatedAt: string
}

type InsightRow = {
  id: string
  capture_id: string
  author_id: string | null
  x: number
  y: number
  note: string
  created_at: string
  updated_at: string
}

const mapInsight = (row: InsightRow): InsightRecord => ({
  id: row.id,
  captureId: row.capture_id,
  authorId: row.author_id,
  x: row.x,
  y: row.y,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export type ListInsightsParams = {
  captureId: string
}

export const listInsightsByCapture = async (
  client: SupabaseRepositoryClient,
  params: ListInsightsParams,
): Promise<InsightRecord[]> => {
  const { data, error } = await client
    .from("insights")
    .select(INSIGHT_SELECT_FIELDS)
    .eq("capture_id", params.captureId)
    .order("created_at", { ascending: true })

  ensureData(data, error, "Failed to load insights.")
  return (data as InsightRow[]).map(mapInsight)
}

export type CreateInsightInput = {
  captureId: string
  note: string
  x: number
  y: number
  authorId?: string | null
}

export const createInsight = async (
  client: SupabaseRepositoryClient,
  input: CreateInsightInput,
): Promise<InsightRecord> => {
  const payload = {
    capture_id: input.captureId,
    note: input.note,
    x: input.x,
    y: input.y,
    author_id: input.authorId ?? null,
  }

  const { data, error } = await client
    .from("insights")
    .insert(payload)
    .select(INSIGHT_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to create insight.")
  return mapInsight(row as InsightRow)
}

export type UpdateInsightInput = {
  captureId: string
  insightId: string
  note?: string
  x?: number
  y?: number
}

export const updateInsight = async (
  client: SupabaseRepositoryClient,
  input: UpdateInsightInput,
): Promise<InsightRecord> => {
  const updates: Record<string, unknown> = {}
  if (typeof input.note === "string") updates.note = input.note
  if (typeof input.x === "number") updates.x = input.x
  if (typeof input.y === "number") updates.y = input.y

  if (Object.keys(updates).length === 0) {
    return getInsightById(client, { captureId: input.captureId, insightId: input.insightId })
  }

  const { data, error } = await client
    .from("insights")
    .update(updates)
    .eq("capture_id", input.captureId)
    .eq("id", input.insightId)
    .select(INSIGHT_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to update insight.")
  return mapInsight(row as InsightRow)
}

export type GetInsightParams = {
  captureId: string
  insightId: string
}

export const getInsightById = async (
  client: SupabaseRepositoryClient,
  params: GetInsightParams,
): Promise<InsightRecord> => {
  const { data, error } = await client
    .from("insights")
    .select(INSIGHT_SELECT_FIELDS)
    .eq("capture_id", params.captureId)
    .eq("id", params.insightId)
    .maybeSingle()

  const row = ensureData(data, error, "Unable to find the insight.")
  return mapInsight(row as InsightRow)
}

export type DeleteInsightInput = {
  captureId: string
  insightId: string
}

export const deleteInsight = async (
  client: SupabaseRepositoryClient,
  input: DeleteInsightInput,
): Promise<void> => {
  const { error } = await client
    .from("insights")
    .delete()
    .eq("capture_id", input.captureId)
    .eq("id", input.insightId)

  if (error) {
    throw new RepositoryError(`Failed to delete insight: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }
}

export const createInsightsRepository = (client: SupabaseRepositoryClient) => ({
  listByCapture: (params: ListInsightsParams) => listInsightsByCapture(client, params),
  getById: (params: GetInsightParams) => getInsightById(client, params),
  create: (input: CreateInsightInput) => createInsight(client, input),
  update: (input: UpdateInsightInput) => updateInsight(client, input),
  remove: (input: DeleteInsightInput) => deleteInsight(client, input),
})
