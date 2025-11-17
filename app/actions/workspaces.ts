"use server"

import { createFoldersRepository } from "@/lib/repositories/folders"
import type { FolderRecord } from "@/lib/repositories/folders"
import { createPatternsRepository } from "@/lib/repositories/patterns"
import type { PatternRecord } from "@/lib/repositories/patterns"
import { RepositoryError } from "@/lib/repositories/types"
import { createTagsRepository } from "@/lib/repositories/tags"
import type { TagRecord } from "@/lib/repositories/tags"

import {
  createActionSupabaseClient,
  ensureWorkspaceRole,
  requireAuthenticatedUser,
} from "./_workspace-guards"

export type WorkspaceMembershipPayload = {
  workspaceId: string
  favoritePatternIds: string[]
}

export type WorkspacePatternsPayload = {
  records: PatternRecord[]
  tagIdsByPattern: Record<string, string[]>
}

export const getWorkspaceMembershipAction = async (): Promise<WorkspaceMembershipPayload> => {
  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, favorite_pattern_ids")
    .eq("profile_id", user.id)
    .order("role", { ascending: true })

  if (error) {
    throw new RepositoryError(`Failed to load workspace information: ${error.message}`)
  }

  const membership = data?.[0]
  if (!membership) {
    throw new RepositoryError("No workspace is linked.", { status: 404 })
  }

  const favoritePatternIds = ((membership.favorite_pattern_ids ?? []) as string[]).filter(Boolean)

  return {
    workspaceId: membership.workspace_id as string,
    favoritePatternIds,
  }
}

export const listWorkspacePatternsWithTagsAction = async (
  workspaceId: string,
): Promise<WorkspacePatternsPayload> => {
  if (!workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "viewer")

  const repo = createPatternsRepository(supabase)
  const patternRecords = await repo.list({ workspaceId })

  if (!patternRecords.length) {
    return {
      records: [],
      tagIdsByPattern: {},
    }
  }

  const { data: links, error: tagError } = await supabase
    .from("pattern_tags")
    .select("pattern_id, tag_id")
    .in(
      "pattern_id",
      patternRecords.map((pattern) => pattern.id),
    )

  if (tagError) {
    throw new RepositoryError(`Failed to load pattern tag information: ${tagError.message}`)
  }

  const tagIdsByPattern = (links ?? []).reduce<Record<string, string[]>>((acc, link) => {
    if (!acc[link.pattern_id]) {
      acc[link.pattern_id] = []
    }
    acc[link.pattern_id].push(link.tag_id)
    return acc
  }, {})

  return {
    records: patternRecords,
    tagIdsByPattern,
  }
}

export const listWorkspaceFoldersAction = async (workspaceId: string): Promise<FolderRecord[]> => {
  if (!workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "viewer")

  const repo = createFoldersRepository(supabase)
  return repo.list({ workspaceId })
}

export const listWorkspaceTagsAction = async (
  workspaceId: string,
  options?: { onlyActive?: boolean },
): Promise<TagRecord[]> => {
  if (!workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, workspaceId, "viewer")

  const repo = createTagsRepository(supabase)
  return repo.list({ workspaceId, onlyActive: options?.onlyActive ?? false })
}

type CreateFolderActionInput = {
  workspaceId: string
  name: string
  parentId?: string | null
}

export const createFolderAction = async (
  input: CreateFolderActionInput,
): Promise<FolderRecord> => {
  if (!input?.workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createFoldersRepository(supabase)
  return repo.create({ workspaceId: input.workspaceId, name: input.name, parentId: input.parentId ?? null })
}

type UpdateFolderActionInput = {
  workspaceId: string
  folderId: string
  name?: string
  parentId?: string | null
}

export const updateFolderAction = async (
  input: UpdateFolderActionInput,
): Promise<FolderRecord> => {
  if (!input?.workspaceId || !input.folderId) {
    throw new RepositoryError("workspaceId and folderId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createFoldersRepository(supabase)
  return repo.update({ workspaceId: input.workspaceId, folderId: input.folderId, name: input.name, parentId: input.parentId })
}

type DeleteFolderActionInput = {
  workspaceId: string
  folderId: string
}

export const deleteFolderAction = async (input: DeleteFolderActionInput): Promise<void> => {
  if (!input?.workspaceId || !input.folderId) {
    throw new RepositoryError("workspaceId and folderId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createFoldersRepository(supabase)
  await repo.remove({ workspaceId: input.workspaceId, folderId: input.folderId })
}

type CreateTagActionInput = {
  workspaceId: string
  label?: string
  type?: string
  color?: string | null
}

export const createTagAction = async (
  input: CreateTagActionInput,
): Promise<TagRecord> => {
  if (!input?.workspaceId) {
    throw new RepositoryError("workspaceId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createTagsRepository(supabase)
  return repo.create({
    workspaceId: input.workspaceId,
    label: input.label ?? "New tag",
    type: (input.type as TagRecord["type"]) ?? "custom",
    color: input.color ?? null,
  })
}

type UpdateTagActionInput = {
  workspaceId: string
  tagId: string
  label?: string
  type?: string
  color?: string | null
}

export const updateTagAction = async (
  input: UpdateTagActionInput,
): Promise<TagRecord> => {
  if (!input?.workspaceId || !input.tagId) {
    throw new RepositoryError("workspaceId and tagId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const repo = createTagsRepository(supabase)
  return repo.update({
    workspaceId: input.workspaceId,
    tagId: input.tagId,
    label: input.label,
    type: input.type as TagRecord["type"] | undefined,
    color: input.color ?? null,
  })
}

type DeleteTagActionInput = {
  workspaceId: string
  tagId: string
}

export const deleteTagAction = async (input: DeleteTagActionInput): Promise<void> => {
  if (!input?.workspaceId || !input.tagId) {
    throw new RepositoryError("workspaceId and tagId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const { data: patternRows, error: patternError } = await supabase
    .from("patterns")
    .select("id")
    .eq("workspace_id", input.workspaceId)

  if (patternError) {
    throw new RepositoryError(`Failed to load patterns for tag cleanup: ${patternError.message}`, {
      cause: patternError,
      code: patternError.code,
    })
  }

  const patternIds = (patternRows ?? []).map((row) => row.id as string)
  if (patternIds.length) {
    const { error: tagLinkError } = await supabase
      .from("pattern_tags")
      .delete()
      .eq("tag_id", input.tagId)
      .in("pattern_id", patternIds)

    if (tagLinkError) {
      throw new RepositoryError(`Failed to remove tag assignments: ${tagLinkError.message}`, {
        cause: tagLinkError,
        code: tagLinkError.code,
      })
    }
  }

  const repo = createTagsRepository(supabase)
  await repo.remove({ workspaceId: input.workspaceId, tagId: input.tagId })
}

type TagAssignmentInput = {
  workspaceId: string
  patternId: string
  tagId: string
}

export const assignTagToPatternAction = async (input: TagAssignmentInput): Promise<void> => {
  if (!input?.workspaceId || !input.patternId || !input.tagId) {
    throw new RepositoryError("workspaceId, patternId, and tagId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const { error } = await supabase
    .from("pattern_tags")
    .upsert({ pattern_id: input.patternId, tag_id: input.tagId }, { onConflict: "pattern_id,tag_id" })

  if (error) {
    throw new RepositoryError(`Failed to assign tag: ${error.message}`, { cause: error, code: error.code })
  }
}

export const removeTagFromPatternAction = async (input: TagAssignmentInput): Promise<void> => {
  if (!input?.workspaceId || !input.patternId || !input.tagId) {
    throw new RepositoryError("workspaceId, patternId, and tagId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "editor")

  const { error } = await supabase
    .from("pattern_tags")
    .delete()
    .eq("pattern_id", input.patternId)
    .eq("tag_id", input.tagId)

  if (error) {
    throw new RepositoryError(`Failed to remove tag: ${error.message}`, { cause: error, code: error.code })
  }
}

type SetPatternFavoriteInput = {
  workspaceId: string
  patternId: string
  isFavorite: boolean
}

export const setPatternFavoriteAction = async (
  input: SetPatternFavoriteInput,
): Promise<string[]> => {
  if (!input?.workspaceId || !input.patternId) {
    throw new RepositoryError("workspaceId and patternId are required.")
  }

  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)
  await ensureWorkspaceRole(supabase, input.workspaceId, "viewer")

  const { data, error } = await supabase
    .from("workspace_members")
    .select("favorite_pattern_ids")
    .eq("workspace_id", input.workspaceId)
    .eq("profile_id", user.id)
    .maybeSingle()

  if (error) {
    throw new RepositoryError(`Failed to load favorite patterns: ${error.message}`, { cause: error, code: error.code })
  }
  if (!data) {
    throw new RepositoryError("Workspace membership could not be found.", { status: 404 })
  }

  const nextFavorites = new Set(((data.favorite_pattern_ids ?? []) as string[]).filter(Boolean))
  if (input.isFavorite) {
    nextFavorites.add(input.patternId)
  } else {
    nextFavorites.delete(input.patternId)
  }

  const payload = { favorite_pattern_ids: Array.from(nextFavorites) }
  const { error: updateError } = await supabase
    .from("workspace_members")
    .update(payload)
    .eq("workspace_id", input.workspaceId)
    .eq("profile_id", user.id)

  if (updateError) {
    throw new RepositoryError(`Failed to update favorites: ${updateError.message}`, {
      cause: updateError,
      code: updateError.code,
    })
  }

  return payload.favorite_pattern_ids
}
