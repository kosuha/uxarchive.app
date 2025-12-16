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
import { copyFoldersRecursively } from "@/lib/repositories/copy-utils"
import { revalidatePath } from "next/cache"
import { createActionSupabaseClient, requireAuthenticatedUser } from "./_workspace-guards"
import type { SupabaseRepositoryClient } from "@/lib/repositories/types"

export async function listRepositoryFoldersAction(repositoryId: string) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)

  return listRepositoryFolders(supabase, { repositoryId })
}

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

    await copyFoldersRecursively(supabase, {
        sourceRepositoryId: input.sourceRepositoryId,
        targetRepositoryId: input.targetRepositoryId,
        targetParentId: input.targetParentId,
        sourceFolderIds: [input.sourceFolderId]
    })

    revalidatePath("/", "layout")
}
