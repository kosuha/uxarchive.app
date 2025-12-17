import type { SupabaseRepositoryClient } from "./types";
import { RepositoryError } from "./types";
import { ensureData } from "./utils";
import { TagRecord } from "./tags";

export type RepositoryTagRecord = {
    repositoryId: string;
    tagId: string;
    tag: TagRecord;
};

// Helper to map joined result to cleaner structure
const mapRepositoryTag = (row: any): RepositoryTagRecord => ({
    repositoryId: row.repository_id,
    tagId: row.tag_id,
    tag: {
        id: row.tags.id,
        workspaceId: row.tags.workspace_id,
        label: row.tags.label,
        type: row.tags.type,
        color: row.tags.color,
        isActive: row.tags.is_active,
        createdAt: row.tags.created_at,
    },
});

export const addTagToRepository = async (
    client: SupabaseRepositoryClient,
    repositoryId: string,
    tagId: string,
): Promise<void> => {
    const { error } = await client.from("repository_tags").insert({
        repository_id: repositoryId,
        tag_id: tagId,
    });

    if (error) {
        if (error.code === "23505") {
            // Unique violation - already exists, ignore
            return;
        }
        throw new RepositoryError(
            `Failed to add tag to repository: ${error.message}`,
            {
                cause: error,
                code: error.code,
            },
        );
    }
};

export const removeTagFromRepository = async (
    client: SupabaseRepositoryClient,
    repositoryId: string,
    tagId: string,
): Promise<void> => {
    const { error } = await client
        .from("repository_tags")
        .delete()
        .eq("repository_id", repositoryId)
        .eq("tag_id", tagId);

    if (error) {
        throw new RepositoryError(
            `Failed to remove tag from repository: ${error.message}`,
            {
                cause: error,
                code: error.code,
            },
        );
    }
};

export const listRepositoryTags = async (
    client: SupabaseRepositoryClient,
    repositoryId: string,
): Promise<RepositoryTagRecord[]> => {
    const { data, error } = await client
        .from("repository_tags")
        .select(`
      repository_id,
      tag_id,
      tags!inner (
        id,
        workspace_id,
        label,
        type,
        color,
        is_active,
        created_at
      )
    `)
        .eq("repository_id", repositoryId);

    const rows = ensureData(data, error, "Failed to load repository tags.");
    return rows.map(mapRepositoryTag);
};

export const listAllRepositoryTagsForWorkspace = async (
    client: SupabaseRepositoryClient,
    workspaceId: string,
): Promise<RepositoryTagRecord[]> => {
    // query repository_tags where repository_id is in (repositories where workspace_id = ?)
    // Supabase/PostgREST syntax for nested filter:
    // repository_tags!inner(repository_id, repositories!inner(workspace_id))
    // But repository_tags is the main table.
    // We can join repositories to filter.

    const { data, error } = await client
        .from("repository_tags")
        .select(`
      repository_id,
      tag_id,
      tags!inner (
        id,
        workspace_id,
        label,
        type,
        color,
        is_active,
        created_at
      ),
      repositories!inner (
        id,
        workspace_id
      )
    `)
        .eq("repositories.workspace_id", workspaceId);

    const rows = ensureData(
        data,
        error,
        "Failed to load workspace repository tags.",
    );
    return rows.map(mapRepositoryTag);
};
