"use server"

import type { CreatePatternInput } from "@/lib/repositories/patterns"
import { createPatternsRepository } from "@/lib/repositories/patterns"
import { RepositoryError } from "@/lib/repositories/types"
import { PATTERN_NAME_MAX_LENGTH, PATTERN_SERVICE_NAME_MAX_LENGTH } from "@/lib/field-limits"
import { DEFAULT_PATTERN_SERVICE_NAME } from "@/lib/pattern-constants"
import { ensurePatternCreationAllowed, ensureSharingAllowed } from "@/lib/plan-limits"

import {
  createActionSupabaseClient,
  ensureWorkspaceRole,
  requireAuthenticatedUser,
} from "./_workspace-guards"
import { ensureMaxLength } from "./_validation"

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

type CreatePatternActionInput = Omit<CreatePatternInput, "createdBy" | "serviceName"> & {
  serviceName?: string
  createdBy?: string | null
}

export const createPatternAction = async (input: CreatePatternActionInput) => {
  if (!input?.workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const serviceName = input.serviceName ?? DEFAULT_PATTERN_SERVICE_NAME

  ensureMaxLength(input.name, PATTERN_NAME_MAX_LENGTH, "Pattern name")
  ensureMaxLength(serviceName, PATTERN_SERVICE_NAME_MAX_LENGTH, "Service name")

  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")
  await ensurePatternCreationAllowed(supabase, user.id, input.workspaceId)

  const repo = createPatternsRepository(supabase)
  return repo.create({ ...input, serviceName, createdBy: input.createdBy ?? user.id })
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

  if (typeof input.name === "string") {
    ensureMaxLength(input.name, PATTERN_NAME_MAX_LENGTH, "Pattern name")
  }
  if (typeof input.serviceName === "string") {
    ensureMaxLength(input.serviceName, PATTERN_SERVICE_NAME_MAX_LENGTH, "Service name")
  }

  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")
  if (input.isPublic === true) {
    await ensureSharingAllowed(supabase, user.id)
  }

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
