"use server"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createSupabaseServerActionClient } from "@/lib/supabase/server-clients"

import type { CaptureRecord } from "@/lib/captures/types"

type ServerActionSupabaseClient = SupabaseClient

type FinalizeCaptureUploadInput = {
  workspaceId: string
  patternId: string
  captureId: string
  width?: number | null
  height?: number | null
  posterStoragePath?: string | null
  refreshPublicUrl?: boolean
}

const requireAuthenticatedUser = async (supabase: ServerActionSupabaseClient): Promise<User> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    throw new Error(`Unable to load Supabase auth information: ${error.message}`)
  }
  if (!user) {
    throw new Error("You must be signed in.")
  }
  return user
}

const fetchPatternWorkspaceId = async (supabase: ServerActionSupabaseClient, patternId: string) => {
  const { data, error } = await supabase
    .from("patterns")
    .select("workspace_id")
    .eq("id", patternId)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to fetch pattern information: ${error.message}`)
  }

  if (!data) {
    throw new Error("Pattern information was not found.")
  }

  return data.workspace_id as string
}

const ensureWorkspaceEditorRole = async (supabase: ServerActionSupabaseClient, workspaceId: string) => {
  const { data, error } = await supabase.rpc("workspace_has_min_role", {
    target_workspace_id: workspaceId,
    min_role: "editor",
  })

  if (error) {
    throw new Error(`Unable to verify workspace permissions: ${error.message}`)
  }

  if (data !== true) {
    throw new Error("You do not have permission to update capture metadata.")
  }
}

const getCaptureRecord = async (
  supabase: ServerActionSupabaseClient,
  patternId: string,
  captureId: string,
) => {
  const { data, error } = await supabase
    .from("captures")
    .select(
      "id, pattern_id, storage_path, media_type, mime_type, order_index, width, height, poster_storage_path, public_url, created_at",
    )
    .eq("id", captureId)
    .eq("pattern_id", patternId)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to fetch capture information: ${error.message}`)
  }

  if (!data) {
    throw new Error("Capture information was not found.")
  }

  return data as CaptureRecord
}

const resolveStoragePublicUrl = async (supabase: ServerActionSupabaseClient, storagePath: string) => {
  const { data, error } = await supabase.rpc("resolve_storage_public_url", {
    storage_path: storagePath,
  })

  if (error) {
    throw new Error(`Unable to compute the storage URL: ${error.message}`)
  }

  return data as string | null
}

const sanitizeDimension = (value: number | null | undefined, field: "width" | "height") => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`The ${field} value must be positive.`)
  }
  return Math.round(value)
}

export const finalizeCaptureUpload = async (
  input: FinalizeCaptureUploadInput,
): Promise<CaptureRecord> => {
  const supabase = (await createSupabaseServerActionClient()) as ServerActionSupabaseClient
  await requireAuthenticatedUser(supabase)

  const workspaceId = await fetchPatternWorkspaceId(supabase, input.patternId)

  if (workspaceId !== input.workspaceId) {
    throw new Error("workspaceId does not match the pattern information.")
  }

  await ensureWorkspaceEditorRole(supabase, input.workspaceId)

  const capture = await getCaptureRecord(supabase, input.patternId, input.captureId)

  const width = sanitizeDimension(input.width, "width")
  const height = sanitizeDimension(input.height, "height")
  const updates: Record<string, unknown> = {}

  if (width !== undefined) updates.width = width
  if (height !== undefined) updates.height = height
  if (input.posterStoragePath !== undefined) {
    updates.poster_storage_path = input.posterStoragePath
  }

  if (input.refreshPublicUrl ?? true) {
    updates.public_url = await resolveStoragePublicUrl(supabase, capture.storage_path)
  }

  if (Object.keys(updates).length === 0) {
    return capture
  }

  const { data, error } = await supabase
    .from("captures")
    .update(updates)
    .eq("id", capture.id)
    .eq("pattern_id", input.patternId)
    .select(
      "id, pattern_id, storage_path, media_type, mime_type, order_index, width, height, poster_storage_path, public_url, created_at",
    )
    .single()

  if (error || !data) {
    throw new Error(error?.message || "Failed to update capture metadata.")
  }

  return data as CaptureRecord
}
