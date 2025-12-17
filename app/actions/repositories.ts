"use server";

import {
  createRepository,
  type CreateRepositoryInput,
  deleteRepository,
  type ListPublicRepositoriesParams,
  listPublicRepositoriesWithPagination,
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
import {
  createRepositoryFolder,
  listRepositoryFolders,
} from "@/lib/repositories/repository-folders";
import { createAsset } from "@/lib/repositories/assets";
import {
  ensureForkAllowed,
  ensurePrivateRepositoryAllowed,
  ensureRepositoryCreationAllowed,
} from "@/lib/plan-limits";

export async function listRepositoriesAction(workspaceId: string) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  return listRepositories(supabase, { workspaceId });
}

export async function createRepositoryAction(input: CreateRepositoryInput) {
  const supabase = await createActionSupabaseClient();
  const user = await requireAuthenticatedUser(supabase);

  // Determine effective visibility (defaults to PUBLIC if not specified)
  const effectiveIsPublic = input.isPublic ??
    (input.isPrivate !== undefined ? !input.isPrivate : true);

  // Check limits
  await ensureRepositoryCreationAllowed(supabase, user.id, input.workspaceId);

  // Only check private limit if it is effectively private
  if (!effectiveIsPublic) {
    await ensurePrivateRepositoryAllowed(supabase, user.id, input.workspaceId);
  }

  const record = await createRepository(supabase, input);
  revalidatePath("/", "layout");
  return record;
}

export async function updateRepositoryAction(input: UpdateRepositoryInput) {
  const supabase = await createActionSupabaseClient();
  const user = await requireAuthenticatedUser(supabase);

  // Check limits if switching to private
  if (input.isPublic === false) {
    // If we are currently public, this will increment the private count
    // If we are already private, this is a no-op regarding limit
    // We fetch current state to be sure
    const { data: current } = await supabase.from("repositories").select(
      "is_public",
    ).eq("id", input.id).single();
    if (current && current.is_public === true) {
      await ensurePrivateRepositoryAllowed(
        supabase,
        user.id,
        input.workspaceId,
      );
    }
  }

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
  try {
    const supabase = await createActionSupabaseClient();
    const user = await requireAuthenticatedUser(supabase);

    // Check limits
    await ensureForkAllowed(supabase, user.id);
    await ensureRepositoryCreationAllowed(supabase, user.id, input.workspaceId);
    await ensurePrivateRepositoryAllowed(supabase, user.id, input.workspaceId);

    // 1. Create Forked Repository Record
    const newRepo = await createRepository(supabase, {
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      isPublic: false, // Forks usually private by default?
      forkOriginId: input.sourceRepositoryId,
    });

    // 2. Increment Fork Count on Source
    // Logic: fetch source, update +1 only if NOT a self-fork (user is not member of source workspace).
    const { data: sourceRepo } = await supabase.from("repositories").select(
      "fork_count, workspace_id",
    ).eq("id", input.sourceRepositoryId).single();

    if (sourceRepo) {
      // Check if user is member of source workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", sourceRepo.workspace_id)
        .eq("profile_id", user.id)
        .maybeSingle();

      const isSelfFork = !!membership;

      if (!isSelfFork) {
        await supabase.from("repositories").update({
          fork_count: (sourceRepo.fork_count || 0) + 1,
        }).eq("id", input.sourceRepositoryId);
      }
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
    return { data: newRepo, error: null };
  } catch (error) {
    console.error("Fork repository error:", error);
    return {
      data: null,
      error: error instanceof Error
        ? error.message
        : "Failed to fork repository",
    };
  }
}

export async function forkRepositoryToDefaultAction(input: {
  sourceRepositoryId: string;
  name: string;
  description?: string | null;
}) {
  try {
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
  } catch (error) {
    console.error("Fork repository to default error:", error);
    return {
      data: null,
      error: error instanceof Error
        ? error.message
        : "Failed to fork repository",
    };
  }
}

export async function forkFolderAction(input: {
  sourceFolderId: string;
  sourceRepositoryId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
}) {
  try {
    const supabase = await createActionSupabaseClient();
    const user = await requireAuthenticatedUser(supabase);

    // Check limits
    await ensureForkAllowed(supabase, user.id);
    await ensureRepositoryCreationAllowed(supabase, user.id, input.workspaceId);
    await ensurePrivateRepositoryAllowed(supabase, user.id, input.workspaceId);

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
      "fork_count, workspace_id",
    ).eq("id", input.sourceRepositoryId).single();

    if (sourceRepo) {
      // Check if user is member of source workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", sourceRepo.workspace_id)
        .eq("profile_id", user.id)
        .maybeSingle();

      const isSelfFork = !!membership;

      if (!isSelfFork) {
        await supabase.from("repositories").update({
          fork_count: (sourceRepo.fork_count || 0) + 1,
        }).eq("id", input.sourceRepositoryId);
      }
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
    return { data: newRepo, error: null };
  } catch (error) {
    console.error("Fork folder error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to fork folder",
    };
  }
}

export async function forkFolderToDefaultAction(input: {
  sourceFolderId: string;
  sourceRepositoryId: string;
  name: string;
  description?: string | null;
}) {
  try {
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
  } catch (error) {
    console.error("Fork folder to default error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to fork folder",
    };
  }
}

export async function moveRepositoryToRepositoryAction(input: {
  sourceRepositoryId: string;
  targetRepositoryId: string;
  targetFolderId?: string | null;
}) {
  const supabase = await createActionSupabaseClient();
  await requireAuthenticatedUser(supabase);

  const { sourceRepositoryId, targetRepositoryId, targetFolderId } = input;

  if (sourceRepositoryId === targetRepositoryId) {
    throw new Error("Cannot move a repository into itself.");
  }

  // 1. Fetch Source Repository to get name and workspaceId
  const { data: sourceRepo, error: sourceError } = await supabase
    .from("repositories")
    .select("*")
    .eq("id", sourceRepositoryId)
    .single();

  if (sourceError || !sourceRepo) {
    throw new Error("Source repository not found.");
  }

  // 2. Create Root Folder in Target Repository
  // We use the source repo name for the new folder
  const newRootFolder = await createRepositoryFolder(supabase, {
    repositoryId: targetRepositoryId,
    name: sourceRepo.name,
    description: sourceRepo.description,
    parentId: targetFolderId || null,
  });

  // 3. Move Content

  // 3.1 Identify Root Items in Source Repo
  // Get all folders in source repo
  const allFolders = await listRepositoryFolders(supabase, {
    repositoryId: sourceRepositoryId,
  });
  const rootFolders = allFolders.filter((f) => f.parentId === null);

  // Get all assets in source repo
  const { data: allAssets } = await supabase
    .from("assets")
    .select("id, folder_id")
    .eq("repository_id", sourceRepositoryId);

  const rootAssets = allAssets?.filter((a) => a.folder_id === null) || [];

  // 3.2 Update ALL items (folders and assets) to new repository_id
  // Bulk update table 'repository_folders'
  const { error: folderError } = await supabase
    .from("repository_folders")
    .update({ repository_id: targetRepositoryId })
    .eq("repository_id", sourceRepositoryId);

  if (folderError) {
    throw new Error(`Failed to move folders: ${folderError.message}`);
  }

  // Bulk update table 'assets'
  const { error: assetError } = await supabase
    .from("assets")
    .update({ repository_id: targetRepositoryId })
    .eq("repository_id", sourceRepositoryId);

  if (assetError) {
    throw new Error(`Failed to move assets: ${assetError.message}`);
  }

  // 3.3 Re-parent the ORIGINAL root items to the new folder

  if (rootFolders.length > 0) {
    const { error: reParentFolderError } = await supabase
      .from("repository_folders")
      .update({ parent_id: newRootFolder.id })
      .in("id", rootFolders.map((f) => f.id));

    if (reParentFolderError) {
      throw new Error(
        `Failed to reparent folders: ${reParentFolderError.message}`,
      );
    }
  }

  if (rootAssets.length > 0) {
    const { error: reParentAssetError } = await supabase
      .from("assets")
      .update({ folder_id: newRootFolder.id })
      .in("id", rootAssets.map((a) => a.id));

    if (reParentAssetError) {
      throw new Error(
        `Failed to reparent assets: ${reParentAssetError.message}`,
      );
    }
  }

  // 4. Delete Source Repository
  await deleteRepository(supabase, {
    id: sourceRepositoryId,
    workspaceId: sourceRepo.workspace_id,
  });

  revalidatePath("/", "layout");
}

export async function getPublicRepositoriesAction(
  params: ListPublicRepositoriesParams,
) {
  const supabase = await createActionSupabaseClient();
  return listPublicRepositoriesWithPagination(supabase, params);
}
