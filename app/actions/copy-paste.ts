"use server";

import {
    createActionSupabaseClient,
    requireAuthenticatedUser,
} from "./_workspace-guards";
import { type AssetRecord, createAsset } from "@/lib/repositories/assets";
import { revalidatePath } from "next/cache";

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
