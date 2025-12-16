"use server";

import {
    createActionSupabaseClient,
    requireAuthenticatedUser,
} from "./_workspace-guards";
import { type AssetRecord, createAsset } from "@/lib/repositories/assets";
import { revalidatePath } from "next/cache";
import { getRepositoryById } from "@/lib/repositories/repositories";
import {
    createRepositoryFolder,
    listRepositoryFolders,
} from "@/lib/repositories/repository-folders";
import { listAssets } from "@/lib/repositories/assets";
import { copyFoldersRecursively } from "@/lib/repositories/copy-utils";

export async function duplicateAssetAction({
    assetId,
    targetRepositoryId,
    targetFolderId,
}: {
    assetId: string;
    targetRepositoryId: string;
    targetFolderId: string | null;
}) {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    // 1. Get original asset
    const { data: originalAsset, error: fetchError } = await supabase
        .from("assets")
        .select("*")
        .eq("id", assetId)
        .single();

    if (fetchError || !originalAsset) {
        throw new Error("Original asset not found");
    }

    // 2. Copy file in storage
    const newStoragePath = `assets/${crypto.randomUUID()}.${
        originalAsset.storage_path.split(".").pop()
    }`;

    // Check if storage path exists (it should)
    // Note: copy() might fail if we don't have permission or file missing
    const { error: copyError } = await supabase.storage
        .from("ux-archive-captures")
        .copy(originalAsset.storage_path, newStoragePath);

    if (copyError) {
        throw new Error(`Failed to copy file in storage: ${copyError.message}`);
    }

    // 3. Create new DB record
    const { data: newAsset, error: createError } = await supabase
        .from("assets")
        .insert({
            repository_id: targetRepositoryId,
            folder_id: targetFolderId, // Can be null
            storage_path: newStoragePath,
            width: originalAsset.width,
            height: originalAsset.height,
            meta: originalAsset.meta,
            order: originalAsset.order, // You might want to adjust this or fetch max order
        })
        .select()
        .single();

    if (createError) {
        // Cleanup storage if db fails?
        await supabase.storage.from("ux-archive-captures").remove([
            newStoragePath,
        ]);
        throw new Error(
            `Failed to create asset record: ${createError.message}`,
        );
    }

    revalidatePath("/", "layout");
    return newAsset;
}

// TODO: duplicateFolderAction implementation
// Recursively duplicate folder structure and assets.
// This is more complex and might timeout for large folders.
// For now, we will just support Asset duplication as per primary request context.

export async function copyRepositoryAsFolderAction(input: {
    sourceRepositoryId: string;
    targetRepositoryId: string;
    targetParentId: string | null;
}) {
    const supabase = await createActionSupabaseClient();
    await requireAuthenticatedUser(supabase);

    // Validate Inputs
    if (input.sourceRepositoryId === "undefined") {
        throw new Error("[Validation] Source ID is string 'undefined'");
    }
    if (input.targetRepositoryId === "undefined") {
        throw new Error("[Validation] Target ID is string 'undefined'");
    }
    if (!input.sourceRepositoryId) {
        throw new Error("[Validation] Source ID is missing");
    }
    if (!input.targetRepositoryId) {
        throw new Error("[Validation] Target ID is missing");
    }

    // 1. Get Source Info
    let sourceRepo;
    try {
        // Direct query to bypass workspaceId requirement of getRepositoryById helper
        // RLS will ensure we only see repos we have access to.
        const { data, error } = await supabase
            .from("repositories")
            .select("*")
            .eq("id", input.sourceRepositoryId)
            .single();

        if (error || !data) throw new Error("Repository not found");
        sourceRepo = data;
    } catch (e: any) {
        throw new Error(`[Step 1] Get Source Repo Failed: ${e.message || e}`);
    }

    // 2. Create Container Folder
    let containerFolder;
    try {
        containerFolder = await createRepositoryFolder(supabase, {
            repositoryId: input.targetRepositoryId,
            name: sourceRepo.name, // Use repo name for the folder
            parentId: input.targetParentId,
        });
    } catch (e: any) {
        throw new Error(
            `[Step 2] Create Container Folder Failed: ${e.message || e}`,
        );
    }

    // 3. Copy Root Folders (recursive)
    try {
        const sourceFolders = await listRepositoryFolders(supabase, {
            repositoryId: input.sourceRepositoryId,
        });
        const rootSourceFolders = sourceFolders.filter((f) => !f.parentId); // Only roots

        if (rootSourceFolders.length > 0) {
            await copyFoldersRecursively(supabase, {
                sourceRepositoryId: input.sourceRepositoryId,
                targetRepositoryId: input.targetRepositoryId,
                targetParentId: containerFolder.id,
                sourceFolderIds: rootSourceFolders.map((f) => f.id),
            });
        }
    } catch (e: any) {
        throw new Error(
            `[Step 3] Recursive Folder Copy Failed: ${e.message || e}`,
        );
    }

    // 4. Copy Root Assets (Deep Copy)
    try {
        const sourceAssets = await listAssets(supabase, {
            repositoryId: input.sourceRepositoryId,
        });
        const rootSourceAssets = sourceAssets.filter((a) => !a.folderId);

        for (const asset of rootSourceAssets) {
            const extension = asset.storagePath.split(".").pop();
            const newStoragePath = `assets/${crypto.randomUUID()}.${extension}`;

            const { error: copyError } = await supabase.storage
                .from("ux-archive-captures")
                .copy(asset.storagePath, newStoragePath);

            if (copyError) {
                console.error(
                    `Failed to copy storage file for asset ${asset.id}`,
                    copyError,
                );
                continue;
            }

            await createAsset(supabase, {
                repositoryId: input.targetRepositoryId,
                folderId: containerFolder.id,
                storagePath: newStoragePath,
                width: asset.width,
                height: asset.height,
                meta: asset.meta,
                order: asset.order,
            });
        }
    } catch (e: any) {
        throw new Error(`[Step 4] Asset Copy Failed: ${e.message || e}`);
    }

    revalidatePath("/", "layout");
    return containerFolder;
}
