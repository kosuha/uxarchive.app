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
  thumbnailUrl: string | null;
};

const mapRepository = (
  row: RepositoryRow & { assets?: { storage_path: string }[] },
): RepositoryRecord => {
  let thumbnailUrl = null;
  if (row.assets && row.assets.length > 0) {
    thumbnailUrl =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${
        row.assets[0].storage_path
      }`;
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    viewCount: row.view_count,
    forkCount: row.fork_count,
    likeCount: (row as any).like_count ?? 0,
    forkOriginId: row.fork_origin_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnailUrl,
  };
};

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
    is_public: input.isPublic ??
      (input.isPrivate !== undefined ? !input.isPrivate : true),
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

export const listPublicRepositories = async (
  client: SupabaseRepositoryClient,
  limit = 20,
): Promise<RepositoryRecord[]> => {
  // We want to fetch the first asset to use as a thumbnail.
  // Note: Nested limit() support depends on Supabase/PostgREST version.
  // "assets(storage_path, order)" ordered by order, limit 1.
  const { data, error } = await client
    .from("repositories")
    // @ts-ignore - Supabase type definition might not infer the nested select correctly
    .select("*, assets(storage_path, order)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  ensureData(data, error, "Failed to list public repositories.");

  // Sort assets manually if the API didn't sort them, and pick the first one.
  // PostgREST 9+ supports resource embedding with order/limit, but to be safe we sort in map or ensure correct query.
  // Here we just accept what we got. Usually we'd want .order('order', {foreignTable: 'assets', ascending: true}).limit(1, {foreignTable: 'assets'})
  // Since we can't easily express that with simple string select in all versions without specific JS syntax:

  // Refined query for safety if using latest supabase-js:
  // .select('*, assets(storage_path, order)')
  // In mapRepository we'll pick the first one. To be best, we should order assets.
  // However default order might be insertion. Let's assume the returned assets is array.

  // We'll perform a client-side sort of the single repository's assets just in case multiple came back.
  const rows = (data as any[]).map((row) => {
    if (row.assets && Array.isArray(row.assets)) {
      row.assets.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    }
    return row;
  });

  return rows.map(mapRepository);
};

export type ListPublicRepositoriesParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: "recent" | "popular";
};

export const listPublicRepositoriesWithPagination = async (
  client: SupabaseRepositoryClient,
  params: ListPublicRepositoriesParams,
): Promise<{ repositories: RepositoryRecord[]; hasNextPage: boolean }> => {
  const { page = 1, perPage = 24, search, sort = "recent" } = params;
  const from = (page - 1) * perPage;
  const to = from + perPage; // Fetch one extra to check for next page

  let query = client
    .from("repositories")
    // @ts-ignore - Supabase type definition might not infer the nested select correctly
    .select("*, assets(storage_path, order)", { count: "exact" })
    .eq("is_public", true);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (sort === "popular") {
    query = query.order("view_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  // Secondary sort to ensure stable pagination
  if (sort === "popular") {
    query = query.order("created_at", { ascending: false });
  }

  // Fetch one more than perPage to determine if there's a next page
  const { data, error } = await query.range(from, to);

  ensureData(data, error, "Failed to list public repositories.");

  const rows = data as any[];
  const hasNextPage = rows.length > perPage;
  const paginatedRows = hasNextPage ? rows.slice(0, perPage) : rows;

  // Sort assets client-side
  const processedRows = paginatedRows.map((row) => {
    if (row.assets && Array.isArray(row.assets)) {
      row.assets.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    }
    return row;
  });

  return {
    repositories: processedRows.map(mapRepository),
    hasNextPage,
  };
};

export const getPublicRepositoryById = async (
  client: SupabaseRepositoryClient,
  id: string,
): Promise<RepositoryRecord> => {
  const { data, error } = await client
    .from("repositories")
    .select()
    .eq("id", id)
    .eq("is_public", true)
    .single();

  const row = ensureData(data, error, "Repository not found or not public.");
  return mapRepository(row);
};
