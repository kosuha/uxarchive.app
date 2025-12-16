"use server"

import {
  createRepository,
  deleteRepository,
  type CreateRepositoryInput,
  type UpdateRepositoryInput,
  updateRepository,
} from "@/lib/repositories/repositories"
import { revalidatePath } from "next/cache"
import { createActionSupabaseClient, requireAuthenticatedUser } from "./_workspace-guards"

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
