import type { SupabaseRepositoryClient } from "./types"
import { RepositoryError } from "./types"
import { ensureData } from "./utils"

const FOLDER_SELECT_FIELDS = "id, workspace_id, name, parent_id, sort_order, created_at"

export type FolderRecord = {
  id: string
  workspaceId: string
  name: string
  parentId: string | null
  sortOrder: number
  createdAt: string
}

type FolderRow = {
  id: string
  workspace_id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

const mapFolder = (row: FolderRow): FolderRecord => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  parentId: row.parent_id,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
})

export type ListFoldersParams = {
  workspaceId: string
}

export const listFolders = async (
  client: SupabaseRepositoryClient,
  params: ListFoldersParams,
): Promise<FolderRecord[]> => {
  const { data, error } = await client
    .from("folders")
    .select(FOLDER_SELECT_FIELDS)
    .eq("workspace_id", params.workspaceId)
    .order("sort_order", { ascending: true })

  ensureData(data, error, "Failed to load folders.")
  return (data as FolderRow[]).map(mapFolder)
}

export type CreateFolderInput = {
  workspaceId: string
  name: string
  parentId?: string | null
  sortOrder?: number
}

export const createFolder = async (
  client: SupabaseRepositoryClient,
  input: CreateFolderInput,
): Promise<FolderRecord> => {
  const payload = {
    workspace_id: input.workspaceId,
    name: input.name,
    parent_id: input.parentId ?? null,
    sort_order: input.sortOrder ?? 0,
  }

  const { data, error } = await client
    .from("folders")
    .insert(payload)
    .select(FOLDER_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to create folder.")
  return mapFolder(row as FolderRow)
}

export type UpdateFolderInput = {
  workspaceId: string
  folderId: string
  name?: string
  parentId?: string | null
  sortOrder?: number
}

export const updateFolder = async (
  client: SupabaseRepositoryClient,
  input: UpdateFolderInput,
): Promise<FolderRecord> => {
  const updates: Record<string, unknown> = {}
  if (typeof input.name === "string") updates.name = input.name
  if (input.parentId !== undefined) updates.parent_id = input.parentId
  if (typeof input.sortOrder === "number") updates.sort_order = input.sortOrder

  if (Object.keys(updates).length === 0) {
    return getFolderById(client, { workspaceId: input.workspaceId, folderId: input.folderId })
  }

  const { data, error } = await client
    .from("folders")
    .update(updates)
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.folderId)
    .select(FOLDER_SELECT_FIELDS)
    .single()

  const row = ensureData(data, error, "Failed to update folder.")
  return mapFolder(row as FolderRow)
}

export type GetFolderParams = {
  workspaceId: string
  folderId: string
}

export const getFolderById = async (
  client: SupabaseRepositoryClient,
  params: GetFolderParams,
): Promise<FolderRecord> => {
  const { data, error } = await client
    .from("folders")
    .select(FOLDER_SELECT_FIELDS)
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.folderId)
    .maybeSingle()

  const row = ensureData(data, error, "Unable to find the folder.")
  return mapFolder(row as FolderRow)
}

export type DeleteFolderInput = {
  workspaceId: string
  folderId: string
}

export const deleteFolder = async (
  client: SupabaseRepositoryClient,
  input: DeleteFolderInput,
): Promise<void> => {
  const { error } = await client
    .from("folders")
    .delete()
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.folderId)

  if (error) {
    throw new RepositoryError(`Failed to delete folder: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }
}

export const createFoldersRepository = (client: SupabaseRepositoryClient) => ({
  list: (params: ListFoldersParams) => listFolders(client, params),
  getById: (params: GetFolderParams) => getFolderById(client, params),
  create: (input: CreateFolderInput) => createFolder(client, input),
  update: (input: UpdateFolderInput) => updateFolder(client, input),
  remove: (input: DeleteFolderInput) => deleteFolder(client, input),
})
