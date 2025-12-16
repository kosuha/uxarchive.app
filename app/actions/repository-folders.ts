"use server"

import {
  createRepositoryFolder,
  deleteRepositoryFolder,
  type CreateRepositoryFolderInput,
  type UpdateRepositoryFolderInput,
  updateRepositoryFolder,
  getRepositoryFolderById,
  listRepositoryFolders,
} from "@/lib/repositories/repository-folders"
import { createAsset, listAssets } from "@/lib/repositories/assets"
import { revalidatePath } from "next/cache"
import { createActionSupabaseClient, requireAuthenticatedUser } from "./_workspace-guards"
import type { SupabaseRepositoryClient } from "@/lib/repositories/types"

export async function createRepositoryFolderAction(input: CreateRepositoryFolderInput) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)

  const record = await createRepositoryFolder(supabase, input)
  revalidatePath("/", "layout")
  return record
}

export async function updateRepositoryFolderAction(input: UpdateRepositoryFolderInput) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)

  const record = await updateRepositoryFolder(supabase, input)
  revalidatePath("/", "layout")
  return record
}

export async function deleteRepositoryFolderAction(input: { id: string; repositoryId: string }) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)

  await deleteRepositoryFolder(supabase, input)
  revalidatePath("/", "layout")
}

export async function moveRepositoryFolderAction(input: { id: string; repositoryId: string; newParentId: string | null }) {
    const supabase = await createActionSupabaseClient()
    await requireAuthenticatedUser(supabase)

    // Circular dependency check
    if (input.newParentId) {
        if (input.newParentId === input.id) {
            throw new Error("Cannot move folder into itself")
        }
        // TODO: Deep circular check (ancestors)
    }

    const record = await updateRepositoryFolder(supabase, {
        id: input.id,
        repositoryId: input.repositoryId,
        parentId: input.newParentId
    })
    revalidatePath("/", "layout")
    return record
}

export async function copyRepositoryFolderAction(input: { 
    sourceFolderId: string; 
    sourceRepositoryId: string; // Required to fetch source
    targetRepositoryId: string; 
    targetParentId: string | null 
}) {
    const supabase = await createActionSupabaseClient()
    await requireAuthenticatedUser(supabase)

    // Optimization: Fetch all source folders once to build the tree
    const allSourceFolders = await listRepositoryFolders(supabase, { repositoryId: input.sourceRepositoryId })
    const folderMap = new Map<string, typeof allSourceFolders>() // parentId -> folders
    
    for (const folder of allSourceFolders) {
        // We track children by parentId
        const pid = folder.parentId ?? "root"
        const existing = folderMap.get(pid) ?? []
        existing.push(folder)
        folderMap.set(pid, existing)
    }

    // Recursive helper that uses the pre-fetched map
    async function copyStep(currentSourceId: string, currentTargetParentId: string | null) {
        // Find the current source folder object from the list
        const sourceFolder = allSourceFolders.find(f => f.id === currentSourceId)
        if (!sourceFolder) return // Should not happen if ID is valid

        // 1. Create target folder
        const newFolder = await createRepositoryFolder(supabase, {
            repositoryId: input.targetRepositoryId,
            name: sourceFolder.name + (input.sourceRepositoryId === input.targetRepositoryId && !currentTargetParentId ? " (Copy)" : ""),
            parentId: currentTargetParentId,
            order: sourceFolder.order
        })

        // 2. Copy Assets (Still per-folder fetch, can be optimized later)
        const assets = await listAssets(supabase, { folderId: currentSourceId })
        for (const asset of assets) {
            await createAsset(supabase, {
                folderId: newFolder.id,
                storagePath: asset.storagePath,
                width: asset.width,
                height: asset.height,
                meta: asset.meta,
                order: asset.order
            })
        }

        // 3. Recurse for children
        const children = folderMap.get(currentSourceId) ?? []
        for (const child of children) {
            await copyStep(child.id, newFolder.id)
        }
    }

    await copyStep(input.sourceFolderId, input.targetParentId)

    revalidatePath("/", "layout")
}
