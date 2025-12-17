import type { SupabaseRepositoryClient } from "./types";
import { RepositoryError } from "./types";
import { ensureData } from "./utils";
import { TagRecord } from "./tags";

export type FolderTagRecord = {
    folderId: string;
    tagId: string;
    tag: TagRecord;
};

const mapFolderTag = (row: any): FolderTagRecord => ({
    folderId: row.folder_id,
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

export const addTagToFolder = async (
    client: SupabaseRepositoryClient,
    folderId: string,
    tagId: string,
): Promise<void> => {
    const { error } = await client.from("folder_tags").insert({
        folder_id: folderId,
        tag_id: tagId,
    });

    if (error) {
        if (error.code === "23505") {
            return;
        }
        throw new RepositoryError(
            `Failed to add tag to folder: ${error.message}`,
            {
                cause: error,
                code: error.code,
            },
        );
    }
};

export const removeTagFromFolder = async (
    client: SupabaseRepositoryClient,
    folderId: string,
    tagId: string,
): Promise<void> => {
    const { error } = await client
        .from("folder_tags")
        .delete()
        .eq("folder_id", folderId)
        .eq("tag_id", tagId);

    if (error) {
        throw new RepositoryError(
            `Failed to remove tag from folder: ${error.message}`,
            {
                cause: error,
                code: error.code,
            },
        );
    }
};

export const listFolderTags = async (
    client: SupabaseRepositoryClient,
    folderId: string,
): Promise<FolderTagRecord[]> => {
    const { data, error } = await client
        .from("folder_tags")
        .select(`
      folder_id,
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
        .eq("folder_id", folderId);

    const rows = ensureData(data, error, "Failed to load folder tags.");
    return rows.map(mapFolderTag);
};

export const listAllFolderTagsForRepository = async (
    client: SupabaseRepositoryClient,
    repositoryId: string,
): Promise<FolderTagRecord[]> => {
    const { data, error } = await client
        .from("folder_tags")
        .select(`
      folder_id,
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
      repository_folders!inner (
        id,
        repository_id
      )
    `)
        .eq("repository_folders.repository_id", repositoryId);

    const rows = ensureData(
        data,
        error,
        "Failed to load repository folder tags.",
    );
    return rows.map(mapFolderTag);
};

export const listAllFolderTagsForWorkspace = async (
    client: SupabaseRepositoryClient,
    workspaceId: string,
): Promise<FolderTagRecord[]> => {
    const { data, error } = await client
        .from("folder_tags")
        .select(`
      folder_id,
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
      repository_folders!inner (
        id,
        repository_id,
        repositories!inner (
           workspace_id
        )
      )
    `)
        .eq("repository_folders.repositories.workspace_id", workspaceId);

    const rows = ensureData(
        data,
        error,
        "Failed to load workspace folder tags.",
    );
    return rows.map(mapFolderTag);
};
