import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import type { CaptureRecord } from "@/lib/captures/types"

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/
const DEFAULT_VARIANT = "original"
const DEFAULT_BUCKET = "ux-archive-captures"
const SIGNED_URL_TTL_SECONDS = 60
const MEDIA_TYPE_VIDEO_PREFIX = "video/"

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

type UploadInitPayload = {
  workspaceId: string
  patternId: string
  captureId: string
  filename: string
  contentType: string
  variant?: string
}

type RouteSupabaseClient = SupabaseClient

type CancelUploadPayload = Pick<UploadInitPayload, "workspaceId" | "patternId" | "captureId">

const isSafeSegment = (value: string) => SAFE_SEGMENT.test(value)

const assertSafeSegment = (value: unknown, field: keyof UploadInitPayload | "variant") => {
  if (typeof value !== "string" || !isSafeSegment(value)) {
    throw new HttpError(`${field} 값이 올바르지 않습니다.`, 400)
  }
  return value
}

const assertFileName = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError("filename 값이 필요합니다.", 400)
  }
  return value.trim()
}

const assertContentType = (value: unknown) => {
  if (typeof value !== "string" || !/^[\w.+-]+\/[\w.+-]+$/.test(value)) {
    throw new HttpError("contentType 값이 올바르지 않습니다.", 400)
  }
  return value
}

const parseRequest = async (request: Request): Promise<UploadInitPayload> => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError("JSON 본문을 파싱할 수 없습니다.", 400)
  }

  if (!body || typeof body !== "object") {
    throw new HttpError("유효한 요청 본문이 필요합니다.", 400)
  }

  const payload = body as Record<string, unknown>

  return {
    workspaceId: assertSafeSegment(payload.workspaceId, "workspaceId"),
    patternId: assertSafeSegment(payload.patternId, "patternId"),
    captureId: assertSafeSegment(payload.captureId, "captureId"),
    filename: assertFileName(payload.filename),
    contentType: assertContentType(payload.contentType),
    variant: payload.variant ? assertSafeSegment(payload.variant, "variant") : undefined,
  }
}

const parseCancelRequest = async (request: Request): Promise<CancelUploadPayload> => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError("JSON 본문을 파싱할 수 없습니다.", 400)
  }

  if (!body || typeof body !== "object") {
    throw new HttpError("유효한 요청 본문이 필요합니다.", 400)
  }

  const payload = body as Record<string, unknown>

  return {
    workspaceId: assertSafeSegment(payload.workspaceId, "workspaceId"),
    patternId: assertSafeSegment(payload.patternId, "patternId"),
    captureId: assertSafeSegment(payload.captureId, "captureId"),
  }
}

const resolveBucketName = () => process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET

const resolveObjectPath = ({ workspaceId, patternId, captureId, filename, variant }: UploadInitPayload) => {
  const extension = (() => {
    const segments = filename.split(".")
    const ext = segments.length > 1 ? segments.pop() : undefined
    if (!ext) return "bin"
    return ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"
  })()
  const variantSegment = variant ?? DEFAULT_VARIANT
  return `${workspaceId}/${patternId}/${captureId}/${variantSegment}.${extension}`
}

const createSignedUploadUrl = async (objectPath: string, bucket: string) => {
  const supabase = getServiceRoleSupabaseClient()
  return supabase.storage.from(bucket).createSignedUploadUrl(objectPath, SIGNED_URL_TTL_SECONDS)
}

const requireAuthenticatedUser = async (supabase: RouteSupabaseClient): Promise<User> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    throw new Error(`Supabase 인증 정보를 확인할 수 없습니다: ${error.message}`)
  }
  if (!user) {
    throw new HttpError("로그인이 필요합니다.", 401)
  }
  return user
}

const fetchPatternWorkspaceId = async (supabase: RouteSupabaseClient, patternId: string) => {
  const { data, error } = await supabase
    .from("patterns")
    .select("workspace_id")
    .eq("id", patternId)
    .maybeSingle()

  if (error) {
    throw new Error(`패턴 정보를 조회할 수 없습니다: ${error.message}`)
  }

  if (!data) {
    throw new HttpError("패턴 정보를 찾을 수 없습니다.", 404)
  }

  return data.workspace_id as string
}

const ensureWorkspaceEditorRole = async (supabase: RouteSupabaseClient, workspaceId: string) => {
  const { data, error } = await supabase.rpc("workspace_has_min_role", {
    target_workspace_id: workspaceId,
    min_role: "editor",
  })

  if (error) {
    throw new Error(`워크스페이스 권한을 확인할 수 없습니다: ${error.message}`)
  }

  if (data !== true) {
    throw new HttpError("캡처를 업로드할 권한이 없습니다.", 403)
  }
}

const resolveNextOrderIndex = async (supabase: RouteSupabaseClient, patternId: string) => {
  const { data, error } = await supabase
    .from("captures")
    .select("order_index")
    .eq("pattern_id", patternId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`다음 캡처 정렬 값을 계산할 수 없습니다: ${error.message}`)
  }

  const latestIndex = typeof data?.order_index === "number" ? data.order_index : -1
  return latestIndex + 1
}

const detectMediaType = (contentType: string) =>
  contentType.startsWith(MEDIA_TYPE_VIDEO_PREFIX) ? "video" : "image"

const createCaptureRecord = async (
  supabase: RouteSupabaseClient,
  params: {
    captureId: string
    patternId: string
    contentType: string
    orderIndex: number
    objectPath: string
    userId: string
  },
): Promise<CaptureRecord> => {
  const { data, error } = await supabase
    .from("captures")
    .insert({
      id: params.captureId,
      pattern_id: params.patternId,
      storage_path: params.objectPath,
      media_type: detectMediaType(params.contentType),
      mime_type: params.contentType,
      order_index: params.orderIndex,
      uploaded_by: params.userId,
    })
    .select("id, pattern_id, storage_path, media_type, mime_type, order_index, created_at")
    .single()

  // TODO(@server-actions): 업로드 완료 후 width/height, poster_storage_path 등을 업데이트하는 Server Action/잡 연동

  if (error) {
    if (error.code === "23505") {
      throw new HttpError("이미 존재하는 캡처 ID입니다.", 409)
    }
    throw new Error(`캡처 레코드를 생성하지 못했습니다: ${error.message}`)
  }

  return data as CaptureRecord
}

const deleteCaptureRecord = async (
  supabase: RouteSupabaseClient,
  patternId: string,
  captureId: string,
): Promise<CaptureRecord> => {
  const { data: target, error: lookupError } = await supabase
    .from("captures")
    .select("id, pattern_id, storage_path, media_type, mime_type, order_index, created_at")
    .eq("id", captureId)
    .eq("pattern_id", patternId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`삭제 대상 캡처를 조회할 수 없습니다: ${lookupError.message}`)
  }

  if (!target) {
    throw new HttpError("삭제할 캡처를 찾을 수 없습니다.", 404)
  }

  const { error: deleteError } = await supabase
    .from("captures")
    .delete()
    .eq("id", captureId)
    .eq("pattern_id", patternId)

  if (deleteError) {
    throw new Error(`캡처 레코드를 삭제하지 못했습니다: ${deleteError.message}`)
  }

  return target as CaptureRecord
}

const removeStorageObjectIfExists = async (bucket: string, storagePath: string) => {
  const supabase = getServiceRoleSupabaseClient()
  const { error } = await supabase.storage.from(bucket).remove([storagePath])
  if (error) {
    // 객체가 존재하지 않는 경우에도 오류가 발생할 수 있지만, 재시도 용도로만 호출되므로 실패를 치명적으로 취급하지 않는다.
    console.warn(`[captures/upload] 스토리지 객체 삭제 실패 (${storagePath})`, error.message)
  }
}

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = await parseRequest(request)
    const supabase = createRouteHandlerClient({ cookies })
    const user = await requireAuthenticatedUser(supabase)
    const bucket = resolveBucketName()
    const objectPath = resolveObjectPath(payload)

    const patternWorkspaceId = await fetchPatternWorkspaceId(supabase, payload.patternId)

    if (patternWorkspaceId !== payload.workspaceId) {
      throw new HttpError("workspaceId가 패턴 정보와 일치하지 않습니다.", 400)
    }

    await ensureWorkspaceEditorRole(supabase, payload.workspaceId)
    const nextOrderIndex = await resolveNextOrderIndex(supabase, payload.patternId)
    const capture = await createCaptureRecord(supabase, {
      captureId: payload.captureId,
      patternId: payload.patternId,
      contentType: payload.contentType,
      orderIndex: nextOrderIndex,
      objectPath,
      userId: user.id,
    })

    const { data, error } = await createSignedUploadUrl(objectPath, bucket)

    if (error || !data) {
      throw new Error(error?.message || "Supabase Storage 서명 URL을 생성할 수 없습니다.")
    }

    return NextResponse.json({
      bucket,
      objectPath,
      uploadUrl: data.signedUrl,
      token: data.token,
      expiresIn: SIGNED_URL_TTL_SECONDS,
      capture,
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[captures/upload] 처리 실패", error)
    return NextResponse.json({ error: "업로드 URL 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await parseCancelRequest(request)
    const supabase = createRouteHandlerClient({ cookies })
    await requireAuthenticatedUser(supabase)
    const bucket = resolveBucketName()

    const patternWorkspaceId = await fetchPatternWorkspaceId(supabase, payload.patternId)

    if (patternWorkspaceId !== payload.workspaceId) {
      throw new HttpError("workspaceId가 패턴 정보와 일치하지 않습니다.", 400)
    }

    await ensureWorkspaceEditorRole(supabase, payload.workspaceId)
    const deletedCapture = await deleteCaptureRecord(supabase, payload.patternId, payload.captureId)

    await removeStorageObjectIfExists(bucket, deletedCapture.storage_path)

    return NextResponse.json({
      deletedCaptureId: deletedCapture.id,
      storagePath: deletedCapture.storage_path,
      message: "업로드가 취소되어 캡처 레코드를 정리했습니다.",
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[captures/upload] 업로드 취소 처리 실패", error)
    return NextResponse.json({ error: "업로드 취소 처리 중 오류가 발생했습니다." }, { status: 500 })
  }
}
