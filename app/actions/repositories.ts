"use server";

import {
  createRepository,
  type CreateRepositoryInput,
  deleteRepository,
  listRepositories,
  type RepositoryRecord,
  updateRepository,
  type UpdateRepositoryInput,
} from "@/lib/repositories/repositories";
import { revalidatePath } from "next/cache";
import {
  createActionSupabaseClient,
  requireAuthenticatedUser,
} from "./_workspace-guards";
import { copyFoldersRecursively } from "@/lib/repositories/copy-utils";
import { listRepositoryFolders } from "@/lib/repositories/repository-folders";
import { createAsset } from "@/lib/repositories/assets";

export async function listRepositoriesAction(workspaceId: string) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  return listRepositories(supabase, { workspaceId });
}

export async function createRepositoryAction(input: CreateRepositoryInput) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const record = await createRepository(supabase, input);
  revalidatePath("/", "layout");
  return record;
}

export async function updateRepositoryAction(input: UpdateRepositoryInput) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const record = await updateRepository(supabase, input);
  revalidatePath("/", "layout");
  return record;
}

export async function deleteRepositoryAction(
  input: { id: string; workspaceId: string },
) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  await deleteRepository(supabase, input);
  revalidatePath("/", "layout");
}

export async function forkRepositoryAction(input: {
  sourceRepositoryId: string;
  workspaceId: string; // Target workspace
  name: string;
  description?: string | null;
}) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  // 1. Create Forked Repository Record
  const newRepo = await createRepository(supabase, {
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description,
    isPublic: false, // Forks usually private by default?
    forkOriginId: input.sourceRepositoryId,
  });

  // 2. Increment Fork Count on Source
  // Logic: fetch source, update +1.
  // Is there an atomic increment in Supabase JS? or RPC?
  // Doing read-update-write for now.
  // Or just let it slide for MVP if race condition isn't critical.
  const { data: sourceRepo } = await supabase.from("repositories").select(
    "fork_count",
  ).eq("id", input.sourceRepositoryId).single();
  if (sourceRepo) {
    await supabase.from("repositories").update({
      fork_count: (sourceRepo.fork_count || 0) + 1,
    }).eq("id", input.sourceRepositoryId);
  }

  // 3. Copy Content
  // 3.1. Copy Root Assets
  const { data: rootAssets } = await supabase
    .from("assets")
    .select()
    .eq("repository_id", input.sourceRepositoryId)
    .is("folder_id", null);

  if (rootAssets) {
    for (const asset of rootAssets) {
      await createAsset(supabase, {
        repositoryId: newRepo.id,
        folderId: null,
        storagePath: asset.storage_path,
        width: asset.width,
        height: asset.height,
        meta: asset.meta,
        order: asset.order,
      });
    }
  }

  // 3.2. Copy Folders
  const allSourceFolders = await listRepositoryFolders(supabase, {
    repositoryId: input.sourceRepositoryId,
  });
  const rootFolders = allSourceFolders.filter((f) => !f.parentId);

  await copyFoldersRecursively(supabase, {
    sourceRepositoryId: input.sourceRepositoryId,
    targetRepositoryId: newRepo.id,
    targetParentId: null,
    sourceFolderIds: rootFolders.map((f) => f.id),
  });

  revalidatePath("/", "layout");
  return newRepo;
}

export async function forkRepositoryToDefaultAction(input: {
  sourceRepositoryId: string;
  name: string;
  description?: string | null;
}) {
  const supabase = await createActionSupabaseClient();
  const user = await requireAuthenticatedUser(supabase);

  // 1. Find a target workspace for the user
  // We pick the first workspace they are a member of (Owner/Editor preference?)
  // Reusing the logic from getWorkspaceMembershipAction basically
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("role", { ascending: true }) // owner first
    .limit(1)
    .single();

  if (!membership) {
    throw new Error("You must belong to a workspace to fork repositories.");
  }

  return forkRepositoryAction({
    sourceRepositoryId: input.sourceRepositoryId,
    workspaceId: membership.workspace_id,
    name: input.name,
    description: input.description,
  });
}

export async function forkFolderAction(input: {
  sourceFolderId: string;
  sourceRepositoryId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
}) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  // 1. Create Forked Repository
  const newRepo = await createRepository(supabase, {
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description,
    isPublic: false,
    forkOriginId: input.sourceRepositoryId,
  });

  // 2. Increment Fork Count on Source Repo (optional but good for tracking)
  const { data: sourceRepo } = await supabase.from("repositories").select(
    "fork_count",
  ).eq("id", input.sourceRepositoryId).single();
  if (sourceRepo) {
    await supabase.from("repositories").update({
      fork_count: (sourceRepo.fork_count || 0) + 1,
    }).eq("id", input.sourceRepositoryId);
  }

  // 3. Copy Content (Promote Folder Content to Root)

  // 3.1. Copy Assets directly in the source folder -> New Repo Root
  const { data: folderAssets } = await supabase
    .from("assets")
    .select()
    .eq("folder_id", input.sourceFolderId);

  if (folderAssets) {
    for (const asset of folderAssets) {
      await createAsset(supabase, {
        repositoryId: newRepo.id,
        folderId: null, // Promote to root
        storagePath: asset.storage_path,
        width: asset.width,
        height: asset.height,
        meta: asset.meta,
        order: asset.order,
      });
    }
  }

  // 3.2. Copy Subfolders -> New Repo Root Folders
  const allRepoFolders = await listRepositoryFolders(supabase, {
    repositoryId: input.sourceRepositoryId,
  });
  const directChildren = allRepoFolders.filter((f) =>
    f.parentId === input.sourceFolderId
  );

  if (directChildren.length > 0) {
    await copyFoldersRecursively(supabase, {
      sourceRepositoryId: input.sourceRepositoryId,
      targetRepositoryId: newRepo.id,
      targetParentId: null, // Promote to root
      sourceFolderIds: directChildren.map((f) => f.id),
    });
  }

  revalidatePath("/", "layout");
  return newRepo;
}

export async function forkFolderToDefaultAction(input: {
  sourceFolderId: string;
  sourceRepositoryId: string;
  name: string;
  description?: string | null;
}) {
  const supabase = await createActionSupabaseClient();
  const user = await requireAuthenticatedUser(supabase);

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("role", { ascending: true })
    .limit(1)
    .single();

  if (!membership) {
    throw new Error("You must belong to a workspace to fork folders.");
  }

  return forkFolderAction({
    sourceFolderId: input.sourceFolderId,
    sourceRepositoryId: input.sourceRepositoryId,
    workspaceId: membership.workspace_id,
    name: input.name,
    description: input.description,
  });
}
