import type { SupabaseRepositoryClient } from "./types";
import { RepositoryError } from "./types";
import { ensureData } from "./utils";
import type { Database } from "../database.types";

type RepositoryRow = Database["public"]["Tables"]["repositories"]["Row"];
type RepositoryInsert = Database["public"]["Tables"]["repositories"]["Insert"];
type RepositoryUpdate = Database["public"]["Tables"]["repositories"]["Update"];

export type RepositoryRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  viewCount: number;
  forkCount: number;
  likeCount: number;
  forkOriginId: string | null;
  createdAt: string;
  updatedAt: string;
};

const mapRepository = (row: RepositoryRow): RepositoryRecord => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  description: row.description,
  isPublic: row.is_public,
  viewCount: row.view_count,
  forkCount: row.fork_count,
  likeCount: (row as any).like_count ?? 0, // Cast to any until types are regenerated
  forkOriginId: row.fork_origin_id ?? null, // handle missing column if types not generated yet (but we added migration)
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type CreateRepositoryInput = {
  workspaceId: string;
  name: string;
  description?: string | null;
  isPublic?: boolean;
  isPrivate?: boolean;
  forkOriginId?: string | null;
};

export const createRepository = async (
  client: SupabaseRepositoryClient,
  input: CreateRepositoryInput,
): Promise<RepositoryRecord> => {
  const payload: RepositoryInsert = {
    workspace_id: input.workspaceId,
    name: input.name,
    description: input.description,
    is_public: input.isPublic,
    fork_origin_id: input.forkOriginId,
  };

  const { data, error } = await client
    .from("repositories")
    .insert(payload)
    .select()
    .single();

  const row = ensureData(data, error, "Failed to create repository.");
  return mapRepository(row);
};

export type UpdateRepositoryInput = {
  id: string;
  workspaceId: string; // Security check: ensure interacting with owned workspace
  name?: string;
  description?: string | null;
  isPublic?: boolean;
};

export const updateRepository = async (
  client: SupabaseRepositoryClient,
  input: UpdateRepositoryInput,
): Promise<RepositoryRecord> => {
  const updates: RepositoryUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.isPublic !== undefined) updates.is_public = input.isPublic;

  const { data, error } = await client
    .from("repositories")
    .update(updates)
    .eq("id", input.id)
    .eq("workspace_id", input.workspaceId)
    .select()
    .single();

  const row = ensureData(data, error, "Failed to update repository.");
  return mapRepository(row);
};

export type DeleteRepositoryInput = {
  id: string;
  workspaceId: string;
};

export const deleteRepository = async (
  client: SupabaseRepositoryClient,
  input: DeleteRepositoryInput,
): Promise<void> => {
  const { error } = await client
    .from("repositories")
    .delete()
    .eq("id", input.id)
    .eq("workspace_id", input.workspaceId);

  if (error) {
    throw new RepositoryError(`Failed to delete repository: ${error.message}`, {
      cause: error,
      code: error.code,
    });
  }
};

export type GetRepositoryParams = {
  workspaceId: string;
  id: string;
};

export const getRepositoryById = async (
  client: SupabaseRepositoryClient,
  params: GetRepositoryParams,
): Promise<RepositoryRecord> => {
  const { data, error } = await client
    .from("repositories")
    .select()
    .eq("id", params.id)
    .eq("workspace_id", params.workspaceId) // Enforce workspace boundary
    .single();

  const row = ensureData(data, error, "Repository not found.");
  return mapRepository(row);
};

export type ListRepositoriesParams = {
  workspaceId: string;
};

export const listRepositories = async (
  client: SupabaseRepositoryClient,
  params: ListRepositoriesParams,
): Promise<RepositoryRecord[]> => {
  const { data, error } = await client
    .from("repositories")
    .select()
    .eq("workspace_id", params.workspaceId)
    .order("created_at", { ascending: false });

  ensureData(data, error, "Failed to list repositories.");
  return (data as RepositoryRow[]).map(mapRepository);
};
