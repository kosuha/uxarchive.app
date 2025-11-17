import type { SupabaseRepositoryClient } from "./types"
import { RepositoryError } from "./types"
import { ensureData } from "./utils"

const CAPTURE_SELECT_FIELDS =
  "id, pattern_id, storage_path, public_url, media_type, mime_type, order_index, width, height, duration_seconds, poster_storage_path, uploaded_by, created_at"

export type CaptureRecord = {
  id: string
  patternId: string
  storagePath: string
  publicUrl: string | null
  mediaType: string
  mimeType: string
  orderIndex: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  posterStoragePath: string | null
  uploadedBy: string | null
  createdAt: string
}

type CaptureRow = {
  id: string
  pattern_id: string
  storage_path: string
  public_url: string | null
  media_type: string
  mime_type: string
  order_index: number
  width: number | null
  height: number | null
  duration_seconds: number | null
  poster_storage_path: string | null
  uploaded_by: string | null
  created_at: string
}

const mapCapture = (row: CaptureRow): CaptureRecord => ({
  id: row.id,
  patternId: row.pattern_id,
  storagePath: row.storage_path,
  publicUrl: row.public_url,
  mediaType: row.media_type,
  mimeType: row.mime_type,
  orderIndex: row.order_index,
  width: row.width,
  height: row.height,
  durationSeconds: row.duration_seconds,
  posterStoragePath: row.poster_storage_path,
  uploadedBy: row.uploaded_by,
  createdAt: row.created_at,
})

export type ListCapturesParams = {
  patternId: string
}

export const listCapturesByPattern = async (
  client: SupabaseRepositoryClient,
  params: ListCapturesParams,
): Promise<CaptureRecord[]> => {
  const { data, error } = await client
    .from("captures")
    .select(CAPTURE_SELECT_FIELDS)
    .eq("pattern_id", params.patternId)
    .order("order_index", { ascending: true })

  ensureData(data, error, "Failed to load captures.")
  return (data as CaptureRow[]).map(mapCapture)
}

export type CreateCaptureInput = {
  patternId: string
  storagePath: string
  mediaType: string
  mimeType: string
  orderIndex: number
  uploadedBy?: string | null
  durationSeconds?: number | null
}

export const createCapture = async (
  client: SupabaseRepositoryClient,
  input: CreateCaptureInput,
): Promise<CaptureRecord> => {
  const payload = {
    pattern_id: input.patternId,
    storage_path: input.storagePath,
    media_type: input.mediaType,
    mime_type: input.mimeType,
    order_index: input.orderIndex,
    uploaded_by: input.uploadedBy ?? null,
    duration_seconds: input.durationSeconds ?? null,
  }

  const { data, error } = await client
    .from("captures")
    .insert(payload)
    .select(CAPTURE_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to create capture.")
  return mapCapture(row as CaptureRow)
}

export type UpdateCaptureInput = {
  captureId: string
  patternId: string
  orderIndex?: number
  publicUrl?: string | null
  width?: number | null
  height?: number | null
  durationSeconds?: number | null
  posterStoragePath?: string | null
}

export const updateCapture = async (
  client: SupabaseRepositoryClient,
  input: UpdateCaptureInput,
): Promise<CaptureRecord> => {
  const updates: Record<string, unknown> = {}
  if (typeof input.orderIndex === "number") updates.order_index = input.orderIndex
  if (input.publicUrl !== undefined) updates.public_url = input.publicUrl
  if (input.width !== undefined) updates.width = input.width
  if (input.height !== undefined) updates.height = input.height
  if (input.durationSeconds !== undefined) updates.duration_seconds = input.durationSeconds
  if (input.posterStoragePath !== undefined) updates.poster_storage_path = input.posterStoragePath

  if (Object.keys(updates).length === 0) {
    return getCaptureById(client, { captureId: input.captureId, patternId: input.patternId })
  }

  const { data, error } = await client
    .from("captures")
    .update(updates)
    .eq("id", input.captureId)
    .eq("pattern_id", input.patternId)
    .select(CAPTURE_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to update capture.")
  return mapCapture(row as CaptureRow)
}

export type GetCaptureParams = {
  captureId: string
  patternId: string
}

export const getCaptureById = async (
  client: SupabaseRepositoryClient,
  params: GetCaptureParams,
): Promise<CaptureRecord> => {
  const { data, error } = await client
    .from("captures")
    .select(CAPTURE_SELECT_FIELDS)
    .eq("pattern_id", params.patternId)
    .eq("id", params.captureId)
    .maybeSingle()

  const row = ensureData(data, error, "Unable to find the capture.")
  return mapCapture(row as CaptureRow)
}

export type DeleteCaptureInput = {
  captureId: string
  patternId: string
}

export const deleteCapture = async (
  client: SupabaseRepositoryClient,
  input: DeleteCaptureInput,
): Promise<void> => {
  const { error } = await client
    .from("captures")
    .delete()
    .eq("pattern_id", input.patternId)
    .eq("id", input.captureId)

  if (error) {
    throw new RepositoryError(`Failed to delete capture: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }
}

export const createCapturesRepository = (client: SupabaseRepositoryClient) => ({
  listByPattern: (params: ListCapturesParams) => listCapturesByPattern(client, params),
  getById: (params: GetCaptureParams) => getCaptureById(client, params),
  create: (input: CreateCaptureInput) => createCapture(client, input),
  update: (input: UpdateCaptureInput) => updateCapture(client, input),
  remove: (input: DeleteCaptureInput) => deleteCapture(client, input),
})
