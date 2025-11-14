import type { SupabaseRepositoryClient } from "./types"
import { RepositoryError } from "./types"
import { ensureData } from "./utils"

const PATTERN_BASE_FIELDS =
  "id, workspace_id, folder_id, name, service_name, summary, author, is_public, is_archived, created_by, created_at, updated_at"

const PATTERN_WITH_COUNTS_FIELDS = `${PATTERN_BASE_FIELDS}, capture_count, insight_count`

export type PatternRecord = {
  id: string
  workspaceId: string
  folderId: string | null
  name: string
  serviceName: string
  summary: string
  author: string
  isPublic: boolean
  isArchived: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
  captureCount: number
  insightCount: number
}

type PatternRow = {
  id: string
  workspace_id: string
  folder_id: string | null
  name: string
  service_name: string
  summary: string
  author: string
  is_public: boolean
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  capture_count: number | null
  insight_count: number | null
}

const mapPattern = (row: PatternRow): PatternRecord => ({
  id: row.id,
  workspaceId: row.workspace_id,
  folderId: row.folder_id,
  name: row.name,
  serviceName: row.service_name,
  summary: row.summary,
  author: row.author,
  isPublic: row.is_public,
  isArchived: row.is_archived,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  captureCount: row.capture_count ?? 0,
  insightCount: row.insight_count ?? 0,
})

export type ListPatternsParams = {
  workspaceId: string
}

export const listPatterns = async (
  client: SupabaseRepositoryClient,
  params: ListPatternsParams,
): Promise<PatternRecord[]> => {
  const { data, error } = await client
    .from("pattern_with_counts")
    .select(PATTERN_WITH_COUNTS_FIELDS)
    .eq("workspace_id", params.workspaceId)
    .order("updated_at", { ascending: false })

  ensureData(data, error, "패턴 목록을 불러오지 못했습니다.")
  return (data as PatternRow[]).map(mapPattern)
}

export type GetPatternParams = {
  workspaceId: string
  patternId: string
}

export const getPatternById = async (
  client: SupabaseRepositoryClient,
  params: GetPatternParams,
): Promise<PatternRecord> => {
  const { data, error } = await client
    .from("pattern_with_counts")
    .select(PATTERN_WITH_COUNTS_FIELDS)
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.patternId)
    .maybeSingle()

  const row = ensureData(data, error, "패턴을 찾을 수 없습니다.")
  return mapPattern(row as PatternRow)
}

export type CreatePatternInput = {
  workspaceId: string
  folderId?: string | null
  name: string
  serviceName: string
  summary: string
  author: string
  isPublic?: boolean
  isArchived?: boolean
  createdBy?: string | null
}

export const createPattern = async (
  client: SupabaseRepositoryClient,
  input: CreatePatternInput,
): Promise<PatternRecord> => {
  const payload = {
    workspace_id: input.workspaceId,
    folder_id: input.folderId ?? null,
    name: input.name,
    service_name: input.serviceName,
    summary: input.summary,
    author: input.author,
    is_public: input.isPublic ?? false,
    is_archived: input.isArchived ?? false,
    created_by: input.createdBy ?? null,
  }

  const { data, error } = await client
    .from("patterns")
    .insert(payload)
    .select("id")
    .single()

  const row = ensureData(data, error, "패턴을 생성하지 못했습니다.") as { id: string }
  return getPatternById(client, { workspaceId: input.workspaceId, patternId: row.id })
}

export type UpdatePatternInput = {
  workspaceId: string
  patternId: string
  name?: string
  serviceName?: string
  summary?: string
  author?: string
  folderId?: string | null
  isPublic?: boolean
  isArchived?: boolean
}

export const updatePattern = async (
  client: SupabaseRepositoryClient,
  input: UpdatePatternInput,
): Promise<PatternRecord> => {
  const updates: Record<string, unknown> = {}

  if (typeof input.name === "string") updates.name = input.name
  if (typeof input.serviceName === "string") updates.service_name = input.serviceName
  if (typeof input.summary === "string") updates.summary = input.summary
  if (typeof input.author === "string") updates.author = input.author
  if (input.folderId !== undefined) updates.folder_id = input.folderId
  if (typeof input.isPublic === "boolean") updates.is_public = input.isPublic
  if (typeof input.isArchived === "boolean") updates.is_archived = input.isArchived

  if (Object.keys(updates).length === 0) {
    return getPatternById(client, { workspaceId: input.workspaceId, patternId: input.patternId })
  }

  const { error } = await client
    .from("patterns")
    .update(updates)
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.patternId)

  if (error) {
    throw new RepositoryError(`패턴을 업데이트하지 못했습니다: ${error.message}`,
      { cause: error, code: error.code, status: error.status })
  }

  return getPatternById(client, { workspaceId: input.workspaceId, patternId: input.patternId })
}

export type DeletePatternInput = {
  workspaceId: string
  patternId: string
}

export const deletePattern = async (
  client: SupabaseRepositoryClient,
  input: DeletePatternInput,
): Promise<void> => {
  const { error } = await client
    .from("patterns")
    .delete()
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.patternId)

  if (error) {
    throw new RepositoryError(`패턴을 삭제하지 못했습니다: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }
}

export const createPatternsRepository = (client: SupabaseRepositoryClient) => ({
  list: (params: ListPatternsParams) => listPatterns(client, params),
  getById: (params: GetPatternParams) => getPatternById(client, params),
  create: (input: CreatePatternInput) => createPattern(client, input),
  update: (input: UpdatePatternInput) => updatePattern(client, input),
  remove: (input: DeletePatternInput) => deletePattern(client, input),
})
