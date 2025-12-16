"use server";

import {
  createAsset,
  type CreateAssetInput,
  deleteAsset,
  listAssets,
  updateAsset,
  type UpdateAssetInput,
} from "@/lib/repositories/assets";
import { revalidatePath } from "next/cache";
import {
  createActionSupabaseClient,
  requireAuthenticatedUser,
} from "./_workspace-guards";

export async function listAssetsAction(
  params: {
    repositoryId?: string;
    folderId?: string | null;
    workspaceId?: string;
    mode?: "recursive";
  },
) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  return listAssets(supabase, params);
}

export async function createAssetAction(input: CreateAssetInput) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const record = await createAsset(supabase, input);
  revalidatePath("/", "layout");
  return record;
}

export async function updateAssetAction(input: UpdateAssetInput) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const record = await updateAsset(supabase, input);
  revalidatePath("/", "layout");
  return record;
}

export async function moveAssetAction(
  input: { id: string; newFolderId: string },
) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const record = await updateAsset(supabase, {
    id: input.id,
    folderId: input.newFolderId,
  });
  revalidatePath("/", "layout");
  return record;
}

export async function deleteAssetAction(input: { id: string }) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  await deleteAsset(supabase, input);
  revalidatePath("/", "layout");
}
