"use server";

import { revalidatePath } from "next/cache";

import {
    createActionSupabaseClient,
    requireAuthenticatedUser,
} from "./_workspace-guards";
import {
    addTagToRepository,
    listAllRepositoryTagsForWorkspace,
    listRepositoryTags,
    removeTagFromRepository,
} from "@/lib/repositories/repository-tags";
import {
    addTagToFolder,
    listAllFolderTagsForWorkspace,
    listFolderTags,
    removeTagFromFolder,
} from "@/lib/repositories/folder-tags";

// Repository Tags Actions

export const listRepositoryTagsAction = async (repositoryId: string) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    return listRepositoryTags(supabase, repositoryId);
};

export const listAllRepositoryTagsInWorkspaceAction = async (
    workspaceId: string,
) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    return listAllRepositoryTagsForWorkspace(supabase, workspaceId);
};

export const addTagToRepositoryAction = async (
    repositoryId: string,
    tagId: string,
) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);
    // Note: Add detailed permission check if needed (e.g. ensureWorkspaceRole)
    // For now assuming write access if they can call this (or rely on RLS/Supabase policies)

    await addTagToRepository(supabase, repositoryId, tagId);
    revalidatePath("/share/r/[id]", "layout"); // Revalidate repository page
};

export const removeTagFromRepositoryAction = async (
    repositoryId: string,
    tagId: string,
) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    await removeTagFromRepository(supabase, repositoryId, tagId);
    revalidatePath("/share/r/[id]", "layout");
};

// Folder Tags Actions

export const listFolderTagsAction = async (folderId: string) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    return listFolderTags(supabase, folderId);
};

export const listAllFolderTagsInWorkspaceAction = async (
    workspaceId: string,
) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    return listAllFolderTagsForWorkspace(supabase, workspaceId);
};

export const addTagToFolderAction = async (folderId: string, tagId: string) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    await addTagToFolder(supabase, folderId, tagId);
    // Revalidate might need to be smarter depending on where folders are shown
    revalidatePath("/share/r/[id]", "layout");
};

export const removeTagFromFolderAction = async (
    folderId: string,
    tagId: string,
) => {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    await removeTagFromFolder(supabase, folderId, tagId);
    revalidatePath("/share/r/[id]", "layout");
};
