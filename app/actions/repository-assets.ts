"use server";

import {
  deleteAsset,
  updateAsset,
  type UpdateAssetInput,
} from "@/lib/repositories/assets";
import { revalidatePath } from "next/cache";
import {
  createActionSupabaseClient,
  requireAuthenticatedUser,
} from "./_workspace-guards";

export async function moveRepositoryAssetAction(
  input: { id: string; repositoryId: string; newFolderId: string | null },
) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  // Verify repository ownership or access if needed, but RLS usually handles it.
  // We just update the folder_id.

  await updateAsset(supabase, {
    id: input.id,
    repositoryId: input.repositoryId, // Optional but good for safety? Actually just updating folder_id is enough if id is unique.
    folderId: input.newFolderId,
  });

  revalidatePath("/", "layout");
}

export async function updateRepositoryAssetAction(input: UpdateAssetInput) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  await updateAsset(supabase, input);
  revalidatePath("/", "layout");
}

export async function deleteRepositoryAssetAction(
  input: { id: string; repositoryId: string },
) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  await deleteAsset(supabase, { id: input.id });

  // If there is a file in storage, we should probably delete it too, but 'deleteAsset' usually handles DB only.
  // If the requirement is to clean up storage, that should be in deleteAsset or a separate service.
  // For now, mirroring existing pattern.

  revalidatePath("/", "layout");
}

export async function reorderAssetsAction(
  input: { items: { id: string; order: number }[]; repositoryId: string },
) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  // Batch update is not natively supported by a single Supabase call easily without RPC or multiple requests.
  // For small batches (e.g. 50 items), parallel requests are okay.
  // Ideally we use an UPSERT or a custom RPC.
  // Given the constraints and likely usage, let's use parallel updates for now or `upsert` if `assets` table allows it easily.
  // `upsert` requires all columns or ignoreDuplicates. We only want to update `order`.
  // So distinct updates are safer to avoid overwriting other fields if we don't have full object.

  // A better approach for performance:
  // Create a RPC or use a sequence of updates.
  // Let's try Promise.all for now.

  const updates = input.items.map((item) =>
    supabase.from("assets").update({ order: item.order }).eq("id", item.id)
  );

  await Promise.all(updates);

  revalidatePath("/", "layout");
}
