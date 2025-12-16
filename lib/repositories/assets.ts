import type { SupabaseRepositoryClient } from "./types";
import { RepositoryError } from "./types";
import { ensureData } from "./utils";
import type { Database, Json } from "../database.types";

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];
type AssetUpdate = Database["public"]["Tables"]["assets"]["Update"];

export type AssetRecord = {
  id: string;
  repositoryId: string | null;
  folderId: string | null;
  storagePath: string;
  width: number | null;
  height: number | null;
  meta: Json | null; // Keeping as Json for flexibility, user can cast
  order: number;
  createdAt: string;
  updatedAt: string;
};

const mapAsset = (row: AssetRow): AssetRecord => ({
  id: row.id,
  repositoryId: row.repository_id,
  folderId: row.folder_id,
  storagePath: row.storage_path,
  width: row.width,
  height: row.height,
  meta: row.meta,
  order: row.order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type CreateAssetInput = {
  repositoryId?: string | null;
  folderId?: string | null;
  storagePath: string;
  width?: number | null;
  height?: number | null;
  meta?: Json | null;
  order?: number;
};

export const createAsset = async (
  client: SupabaseRepositoryClient,
  input: CreateAssetInput,
): Promise<AssetRecord> => {
  const payload: AssetInsert = {
    repository_id: input.repositoryId,
    folder_id: input.folderId,
    storage_path: input.storagePath,
    width: input.width,
    height: input.height,
    meta: input.meta,
    order: input.order ?? 0,
  };

  const { data, error } = await client
    .from("assets")
    .insert(payload)
    .select()
    .single();

  const row = ensureData(data, error, "Failed to create asset.");
  return mapAsset(row);
};

export type UpdateAssetInput = {
  id: string;
  repositoryId?: string | null;
  folderId?: string | null;
  meta?: Json | null;
  order?: number;
  // Usually storagePath, width, height are immutable after creation unless re-uploaded
};

export const updateAsset = async (
  client: SupabaseRepositoryClient,
  input: UpdateAssetInput,
): Promise<AssetRecord> => {
  const updates: AssetUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (input.repositoryId !== undefined) {
    updates.repository_id = input.repositoryId;
  }
  if (input.folderId !== undefined) updates.folder_id = input.folderId;
  if (input.meta !== undefined) updates.meta = input.meta;
  if (input.order !== undefined) updates.order = input.order;

  const { data, error } = await client
    .from("assets")
    .update(updates)
    .eq("id", input.id)
    .select()
    .single();

  const row = ensureData(data, error, "Failed to update asset.");
  return mapAsset(row);
};

export type DeleteAssetInput = {
  id: string;
};

export const deleteAsset = async (
  client: SupabaseRepositoryClient,
  input: DeleteAssetInput,
): Promise<void> => {
  const { error } = await client
    .from("assets")
    .delete()
    .eq("id", input.id);

  if (error) {
    throw new RepositoryError(`Failed to delete asset: ${error.message}`, {
      cause: error,
      code: error.code,
    });
  }
};

export type ListAssetsParams = {
  repositoryId?: string;
  folderId?: string | null;
  workspaceId?: string;
  mode?: "recursive";
};

export const listAssets = async (
  client: SupabaseRepositoryClient,
  params: ListAssetsParams,
): Promise<AssetRecord[]> => {
  // If fetching by workspaceId or recursive repositoryId, we need to join if we want to be safe,
  // but for workspaceId we definitely need join.
  let query = client.from("assets").select(
    "*, repositories!inner(workspace_id)",
  );

  if (params.repositoryId) {
    query = query.eq("repository_id", params.repositoryId);

    if (params.mode !== "recursive") {
      if (params.folderId) {
        query = query.eq("folder_id", params.folderId);
      } else {
        query = query.is("folder_id", null);
      }
    }
  } else if (params.workspaceId) {
    query = query.eq("repositories.workspace_id", params.workspaceId);
    // Implicitly recursive for workspace fetch (we want all assets in workspace)
  } else if (params.folderId) {
    query = query.eq("folder_id", params.folderId);
  }

  const { data, error } = await query.order("order", { ascending: true });

  ensureData(data, error, "Failed to list assets.");
  return (data as any[]).map(mapAsset);
};
