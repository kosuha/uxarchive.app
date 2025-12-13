"use server"

import { createFoldersRepository } from "@/lib/repositories/folders"
import { createPatternsRepository } from "@/lib/repositories/patterns"
import { RepositoryError } from "@/lib/repositories/types"
import {
  createActionSupabaseClient,
  requireAuthenticatedUser,
  ensureWorkspaceRole,
} from "./_workspace-guards"

export const moveFolderAction = async (
  workspaceId: string,
  folderId: string,
  destinationParentId: string | null
): Promise<void> => {
  if (!workspaceId || !folderId) {
    throw new RepositoryError("workspaceId and folderId are required.")
  }

  // Prevent moving folder into itself (simple check, cycle check should ideally be in repo or DB constraint)
  if (folderId === destinationParentId) {
    throw new RepositoryError("Cannot move a folder into itself.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  const repo = createFoldersRepository(supabase)
  await repo.update({
    workspaceId,
    folderId,
    parentId: destinationParentId ?? null,
  })
}

export const movePatternAction = async (
  workspaceId: string,
  patternId: string,
  destinationFolderId: string | null
): Promise<void> => {
  if (!workspaceId || !patternId) {
    throw new RepositoryError("workspaceId and patternId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  const repo = createPatternsRepository(supabase)
  await repo.update({
    workspaceId,
    patternId,
    folderId: destinationFolderId,
  })
}
