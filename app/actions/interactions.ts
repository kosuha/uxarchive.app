"use server";

import {
  createActionSupabaseClient,
  requireAuthenticatedUser,
} from "./_workspace-guards";
import { revalidatePath } from "next/cache";

export async function incrementViewCountAction(patternId: string) {
  if (!patternId) return;

  const supabase = await createActionSupabaseClient();

  // Call RPC function to safely increment
  await supabase.rpc("increment_view_count", { p_id: patternId });
}

// ... existing code ...
export async function toggleLikeAction(patternId: string) {
  if (!patternId) throw new Error("Pattern ID required");

  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const { data: isLiked, error } = await supabase.rpc("toggle_like", {
    p_id: patternId,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Revalidate to update UI counts
  revalidatePath(`/patterns/${patternId}`);
  revalidatePath(`/u/[username]`, "page"); // If user profile shows liked patterns or stats
  revalidatePath("/share"); // Main feed

  return isLiked;
}

export async function toggleRepositoryLikeAction(repositoryId: string) {
  if (!repositoryId) throw new Error("Repository ID required");

  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const { data: isLiked, error } = await supabase.rpc(
    "toggle_repository_like",
    { p_repository_id: repositoryId },
  );

  if (error) {
    throw new Error(error.message);
  }

  // Revalidate to update UI counts
  revalidatePath(`/workspace/${repositoryId}`, "layout"); // Revalidate workspace layout

  return isLiked;
}
