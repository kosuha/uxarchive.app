import type { SupabaseRepositoryClient } from "./types";
import { RepositoryError } from "./types";
import { ensureData } from "./utils";
import type { Database } from "../database.types";

type RepositoryFolderRow =
  Database["public"]["Tables"]["repository_folders"]["Row"];
type RepositoryFolderInsert =
  Database["public"]["Tables"]["repository_folders"]["Insert"];
type RepositoryFolderUpdate =
  Database["public"]["Tables"]["repository_folders"]["Update"];

export type RepositoryFolderRecord = {
  id: string;
  repositoryId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  tags?: { id: string; label: string; color: string }[];
};

const mapRepositoryFolder = (
  row: RepositoryFolderRow,
): RepositoryFolderRecord => ({
  id: row.id,
  repositoryId: row.repository_id,
  parentId: row.parent_id,
  name: row.name,
  description: row.description,
  order: row.order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  tags: ((row as any).folder_tags || []).map((ft: any) => ft.tags).filter((
    t: any,
  ) => !!t),
});

export type CreateRepositoryFolderInput = {
  repositoryId: string;
  name: string;
  parentId?: string | null;
  description?: string | null;
  order?: number;
};

export const createRepositoryFolder = async (
  client: SupabaseRepositoryClient,
  input: CreateRepositoryFolderInput,
): Promise<RepositoryFolderRecord> => {
  const payload: RepositoryFolderInsert = {
    repository_id: input.repositoryId,
    name: input.name,
    parent_id: input.parentId ?? null,
    description: input.description,
    order: input.order ?? 0,
  };

  const { data, error } = await client
    .from("repository_folders")
    .insert(payload)
    .select()
    .single();

  const row = ensureData(data, error, "Failed to create folder.");
  return mapRepositoryFolder(row);
};

export type UpdateRepositoryFolderInput = {
  id: string;
  repositoryId: string; // For security/scoping
  name?: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
};

export const updateRepositoryFolder = async (
  client: SupabaseRepositoryClient,
  input: UpdateRepositoryFolderInput,
): Promise<RepositoryFolderRecord> => {
  const updates: RepositoryFolderUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.parentId !== undefined) updates.parent_id = input.parentId;
  if (input.order !== undefined) updates.order = input.order;

  const { data, error } = await client
    .from("repository_folders")
    .update(updates)
    .eq("id", input.id)
    .eq("repository_id", input.repositoryId)
    .select()
    .single();

  const row = ensureData(data, error, "Failed to update folder.");
  return mapRepositoryFolder(row);
};

export type DeleteRepositoryFolderInput = {
  id: string;
  repositoryId: string;
};

export const deleteRepositoryFolder = async (
  client: SupabaseRepositoryClient,
  input: DeleteRepositoryFolderInput,
): Promise<void> => {
  const { error } = await client
    .from("repository_folders")
    .delete()
    .eq("id", input.id)
    .eq("repository_id", input.repositoryId);

  if (error) {
    throw new RepositoryError(`Failed to delete folder: ${error.message}`, {
      cause: error,
      code: error.code,
    });
  }
};

export type GetRepositoryFolderParams = {
  id: string;
  repositoryId: string;
};

export const getRepositoryFolderById = async (
  client: SupabaseRepositoryClient,
  params: GetRepositoryFolderParams,
): Promise<RepositoryFolderRecord> => {
  const { data, error } = await client
    .from("repository_folders")
    .select()
    .eq("id", params.id)
    .eq("repository_id", params.repositoryId)
    .single();

  const row = ensureData(data, error, "Folder not found.");
  return mapRepositoryFolder(row);
};

export type ListRepositoryFoldersParams = {
  repositoryId?: string;
  workspaceId?: string;
};

export const listRepositoryFolders = async (
  client: SupabaseRepositoryClient,
  params: ListRepositoryFoldersParams,
): Promise<RepositoryFolderRecord[]> => {
  let query = client.from("repository_folders").select(
    "*, repositories!inner(workspace_id), folder_tags(tags(id, label, color))",
  );

  if (params.repositoryId) {
    query = query.eq("repository_id", params.repositoryId);
  } else if (params.workspaceId) {
    query = query.eq("repositories.workspace_id", params.workspaceId);
  }

  const { data, error } = await query.order("order", { ascending: true });

  ensureData(data, error, "Failed to list folders.");
  return (data as any[]).map(mapRepositoryFolder);
};
