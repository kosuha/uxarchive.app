"use server"

import type { CreateTagInput, UpdateTagInput } from "@/lib/repositories/tags"
import { createTagsRepository } from "@/lib/repositories/tags"
import { RepositoryError } from "@/lib/repositories/types"

import {
  createActionSupabaseClient,
  ensureWorkspaceRole,
  requireAuthenticatedUser,
} from "./_workspace-guards"

export const listWorkspaceTagsAction = async (workspaceId: string, onlyActive = true) => {
  if (!workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "viewer")

  const repo = createTagsRepository(supabase)
  return repo.list({ workspaceId, onlyActive })
}

export const createTagAction = async (input: CreateTagInput) => {
  if (!input?.workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createTagsRepository(supabase)
  return repo.create(input)
}

export const updateTagAction = async (input: UpdateTagInput) => {
  if (!input?.workspaceId || !input?.tagId) {
    throw new RepositoryError("workspaceId and tagId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createTagsRepository(supabase)
  return repo.update(input)
}

export const deleteTagAction = async (workspaceId: string, tagId: string) => {
  if (!workspaceId || !tagId) {
    throw new RepositoryError("workspaceId and tagId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  const repo = createTagsRepository(supabase)
  await repo.remove({ workspaceId, tagId })
}
