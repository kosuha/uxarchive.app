"use server"

import type { CreatePatternInput } from "@/lib/repositories/patterns"
import { createPatternsRepository } from "@/lib/repositories/patterns"
import { RepositoryError } from "@/lib/repositories/types"

import {
  createActionSupabaseClient,
  ensureWorkspaceRole,
  requireAuthenticatedUser,
} from "./_workspace-guards"

export const listWorkspacePatternsAction = async (workspaceId: string) => {
  if (!workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "viewer")

  const repo = createPatternsRepository(supabase)
  return repo.list({ workspaceId })
}

type CreatePatternActionInput = Omit<CreatePatternInput, "createdBy"> & {
  createdBy?: string | null
}

export const createPatternAction = async (input: CreatePatternActionInput) => {
  if (!input?.workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createPatternsRepository(supabase)
  return repo.create({ ...input, createdBy: input.createdBy ?? user.id })
}

type UpdatePatternActionInput = {
  workspaceId: string
  patternId: string
  name?: string
  serviceName?: string
  summary?: string
  author?: string
  folderId?: string | null
  isPublic?: boolean
  isArchived?: boolean
}

export const updatePatternAction = async (input: UpdatePatternActionInput) => {
  if (!input?.workspaceId || !input?.patternId) {
    throw new RepositoryError("workspaceId and patternId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createPatternsRepository(supabase)
  return repo.update(input)
}

export const deletePatternAction = async (workspaceId: string, patternId: string) => {
  if (!workspaceId || !patternId) {
    throw new RepositoryError("workspaceId and patternId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  const repo = createPatternsRepository(supabase)
  await repo.remove({ workspaceId, patternId })
}
