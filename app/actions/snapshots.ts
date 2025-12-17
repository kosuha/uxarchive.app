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
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const record = await createSnapshot(supabase, input);
  revalidatePath("/", "layout");
  return record;
}

export async function listSnapshotsAction(repositoryId: string) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  return listSnapshots(supabase, repositoryId);
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
