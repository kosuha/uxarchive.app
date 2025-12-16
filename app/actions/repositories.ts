"use server"

import {
  createRepository,
  deleteRepository,
  type CreateRepositoryInput,
  type UpdateRepositoryInput,
  type RepositoryRecord,
  updateRepository,
  listRepositories,
} from "@/lib/repositories/repositories"
import { revalidatePath } from "next/cache"
import { createActionSupabaseClient, requireAuthenticatedUser } from "./_workspace-guards"
import { copyFoldersRecursively } from "@/lib/repositories/copy-utils"
import { listRepositoryFolders } from "@/lib/repositories/repository-folders"

export async function listRepositoriesAction(workspaceId: string) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  
  return listRepositories(supabase, { workspaceId })
}

export async function createRepositoryAction(input: CreateRepositoryInput) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)

  const record = await createRepository(supabase, input)
  revalidatePath("/", "layout")
  return record
}

export async function updateRepositoryAction(input: UpdateRepositoryInput) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  
  const record = await updateRepository(supabase, input)
  revalidatePath("/", "layout")
  return record
}

export async function deleteRepositoryAction(input: { id: string; workspaceId: string }) {
  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  
  await deleteRepository(supabase, input)
  revalidatePath("/", "layout")
}

export async function forkRepositoryAction(input: {
    sourceRepositoryId: string
    workspaceId: string // Target workspace
    name: string
    description?: string | null
}) {
    const supabase = await createActionSupabaseClient()
    await requireAuthenticatedUser(supabase)

    // 1. Create Forked Repository Record
    const newRepo = await createRepository(supabase, {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
        isPublic: false, // Forks usually private by default?
        forkOriginId: input.sourceRepositoryId
    })

    // 2. Increment Fork Count on Source
    // Logic: fetch source, update +1. 
    // Is there an atomic increment in Supabase JS? or RPC?
    // Doing read-update-write for now.
    // Or just let it slide for MVP if race condition isn't critical.
    const { data: sourceRepo } = await supabase.from("repositories").select("fork_count").eq("id", input.sourceRepositoryId).single()
    if (sourceRepo) {
        await supabase.from("repositories").update({ fork_count: (sourceRepo.fork_count || 0) + 1 }).eq("id", input.sourceRepositoryId)
    }

    // 3. Copy Content
    // Need to find all ROOT folders of source repo
    const allSourceFolders = await listRepositoryFolders(supabase, { repositoryId: input.sourceRepositoryId })
    const rootFolders = allSourceFolders.filter(f => !f.parentId)
    
    await copyFoldersRecursively(supabase, {
        sourceRepositoryId: input.sourceRepositoryId,
        targetRepositoryId: newRepo.id,
        targetParentId: null,
        sourceFolderIds: rootFolders.map(f => f.id)
    })

    revalidatePath("/", "layout")
    return newRepo
}
