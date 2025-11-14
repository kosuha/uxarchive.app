"use server"

import { cookies } from "next/headers"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient, User } from "@supabase/supabase-js"

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
    throw new Error(`Supabase 인증 정보를 확인할 수 없습니다: ${error.message}`)
  }
  if (!user) {
    throw new Error("로그인이 필요합니다.")
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
    throw new Error(`패턴 정보를 조회할 수 없습니다: ${error.message}`)
  }

  if (!data) {
    throw new Error("패턴 정보를 찾을 수 없습니다.")
  }

  return data.workspace_id as string
}

const ensureWorkspaceEditorRole = async (supabase: ServerActionSupabaseClient, workspaceId: string) => {
  const { data, error } = await supabase.rpc("workspace_has_min_role", {
    target_workspace_id: workspaceId,
    min_role: "editor",
  })

  if (error) {
    throw new Error(`워크스페이스 권한을 확인할 수 없습니다: ${error.message}`)
  }

  if (data !== true) {
    throw new Error("캡처 메타데이터를 수정할 권한이 없습니다.")
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
    throw new Error(`캡처 정보를 조회할 수 없습니다: ${error.message}`)
  }

  if (!data) {
    throw new Error("캡처 정보를 찾을 수 없습니다.")
  }

  return data as CaptureRecord
}

const resolveStoragePublicUrl = async (supabase: ServerActionSupabaseClient, storagePath: string) => {
  const { data, error } = await supabase.rpc("resolve_storage_public_url", {
    storage_path: storagePath,
  })

  if (error) {
    throw new Error(`스토리지 URL을 계산할 수 없습니다: ${error.message}`)
  }

  return data as string | null
}

const sanitizeDimension = (value: number | null | undefined, field: "width" | "height") => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${field} 값은 양수여야 합니다.`)
  }
  return Math.round(value)
}

export const finalizeCaptureUpload = async (
  input: FinalizeCaptureUploadInput,
): Promise<CaptureRecord> => {
  const supabase = createServerActionClient({ cookies }) as ServerActionSupabaseClient
  await requireAuthenticatedUser(supabase)

  const workspaceId = await fetchPatternWorkspaceId(supabase, input.patternId)

  if (workspaceId !== input.workspaceId) {
    throw new Error("workspaceId가 패턴 정보와 일치하지 않습니다.")
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
    throw new Error(error?.message || "캡처 메타데이터를 갱신하지 못했습니다.")
  }

  return data as CaptureRecord
}
