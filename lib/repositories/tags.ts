import type { SupabaseRepositoryClient } from "./types"
import { RepositoryError } from "./types"
import { ensureData } from "./utils"

const TAG_SELECT_FIELDS = "id, workspace_id, label, type, color, is_active, created_at"

export type TagRecord = {
  id: string
  workspaceId: string
  label: string
  type: string
  color: string | null
  isActive: boolean
  createdAt: string
}

type TagRow = {
  id: string
  workspace_id: string
  label: string
  type: string
  color: string | null
  is_active: boolean
  created_at: string
}

const mapTag = (row: TagRow): TagRecord => ({
  id: row.id,
  workspaceId: row.workspace_id,
  label: row.label,
  type: row.type,
  color: row.color,
  isActive: row.is_active,
  createdAt: row.created_at,
})

export type ListTagsParams = {
  workspaceId: string
  onlyActive?: boolean
}

export const listTags = async (
  client: SupabaseRepositoryClient,
  params: ListTagsParams,
): Promise<TagRecord[]> => {
  let query = client.from("tags").select(TAG_SELECT_FIELDS).eq("workspace_id", params.workspaceId)
  if (params.onlyActive) {
    query = query.eq("is_active", true)
  }
  const { data, error } = await query.order("label", { ascending: true })
  ensureData(data, error, "Failed to load tags.")
  return (data as TagRow[]).map(mapTag)
}

export type GetTagParams = {
  workspaceId: string
  tagId: string
}

export const getTagById = async (
  client: SupabaseRepositoryClient,
  params: GetTagParams,
): Promise<TagRecord> => {
  const { data, error } = await client
    .from("tags")
    .select(TAG_SELECT_FIELDS)
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.tagId)
    .maybeSingle()

  const row = ensureData(data, error, "Unable to find the tag.")
  return mapTag(row as TagRow)
}

export type CreateTagInput = {
  workspaceId: string
  label: string
  type: string
  color?: string | null
}

export const createTag = async (
  client: SupabaseRepositoryClient,
  input: CreateTagInput,
): Promise<TagRecord> => {
  const payload = {
    workspace_id: input.workspaceId,
    label: input.label,
    type: input.type,
    color: input.color ?? null,
  }

  const { data, error } = await client
    .from("tags")
    .insert(payload)
    .select(TAG_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to create tag.")
  return mapTag(row as TagRow)
}

export type UpdateTagInput = {
  workspaceId: string
  tagId: string
  label?: string
  type?: string
  color?: string | null
  isActive?: boolean
}

export const updateTag = async (
  client: SupabaseRepositoryClient,
  input: UpdateTagInput,
): Promise<TagRecord> => {
  const updates: Record<string, unknown> = {}
  if (typeof input.label === "string") updates.label = input.label
  if (typeof input.type === "string") updates.type = input.type
  if (input.color !== undefined) updates.color = input.color
  if (typeof input.isActive === "boolean") updates.is_active = input.isActive

  if (Object.keys(updates).length === 0) {
    return getTagById(client, { workspaceId: input.workspaceId, tagId: input.tagId })
  }

  const { data, error } = await client
    .from("tags")
    .update(updates)
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.tagId)
    .select(TAG_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to update tag.")
  return mapTag(row as TagRow)
}

export type DeleteTagInput = {
  workspaceId: string
  tagId: string
}

export const deleteTag = async (
  client: SupabaseRepositoryClient,
  input: DeleteTagInput,
): Promise<void> => {
  const { error } = await client
    .from("tags")
    .delete()
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.tagId)

  if (error) {
    throw new RepositoryError(`Failed to delete tag: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }
}

export const createTagsRepository = (client: SupabaseRepositoryClient) => ({
  list: (params: ListTagsParams) => listTags(client, params),
  getById: (params: GetTagParams) => getTagById(client, params),
  create: (input: CreateTagInput) => createTag(client, input),
  update: (input: UpdateTagInput) => updateTag(client, input),
  remove: (input: DeleteTagInput) => deleteTag(client, input),
})
