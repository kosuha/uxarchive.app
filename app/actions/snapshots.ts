"use server";

import {
  createSnapshot,
  deleteSnapshot,
  getSnapshotTree,
  listSnapshots,
  restoreSnapshot,
  type SnapshotRecord,
} from "@/lib/repositories/snapshots";
import { revalidatePath } from "next/cache";
import {
  createActionSupabaseClient,
  requireAuthenticatedUser,
} from "./_workspace-guards";

export async function createSnapshotAction(input: {
  repositoryId: string;
  versionName: string;
  description?: string;
}) {
  console.log("[Action] createSnapshotAction started", input);
  try {
    const client = await createActionSupabaseClient();
    await requireAuthenticatedUser(client); // Keep authentication
    const result = await createSnapshot(client, input);
    console.log("[Action] createSnapshotAction success", result);
    revalidatePath(`/repositories/${input.repositoryId}`);
    return result;
  } catch (e) {
    console.error("[Action] createSnapshotAction failed", e);
    throw e;
  }
}

export async function listSnapshotsAction(repositoryId: string) {
  try {
    const client = await createActionSupabaseClient();
    await requireAuthenticatedUser(client); // Keep authentication
    const result = await listSnapshots(client, repositoryId);
    return result;
  } catch (e) {
    console.error("[Action] listSnapshotsAction failed", e);
    throw e;
  }
}

export async function deleteSnapshotAction(snapshotId: string) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  await deleteSnapshot(supabase, snapshotId);
  revalidatePath("/", "layout");
}

export async function restoreSnapshotAction(
  repositoryId: string,
  snapshotId: string,
) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  await restoreSnapshot(supabase, repositoryId, snapshotId);
  revalidatePath("/", "layout");
}

export async function getSnapshotTreeAction(snapshotId: string) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  return getSnapshotTree(supabase, snapshotId);
}
