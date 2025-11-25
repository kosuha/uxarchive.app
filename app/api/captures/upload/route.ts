import { NextResponse } from "next/server"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import type { CaptureRecord } from "@/lib/captures/types"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"
import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/
const DEFAULT_VARIANT = "original"
const DEFAULT_BUCKET = "ux-archive-captures"
// Supabase signed upload URLs are valid for two hours by default
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2
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
    throw new HttpError(`${field} value is invalid.`, 400)
  }
  return value
}

const assertFileName = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError("The filename value is required.", 400)
  }
  return value.trim()
}

const assertContentType = (value: unknown) => {
  if (typeof value !== "string" || !/^[\w.+-]+\/[\w.+-]+$/.test(value)) {
    throw new HttpError("The contentType value is invalid.", 400)
  }
  return value
}

const parseRequest = async (request: Request): Promise<UploadInitPayload> => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError("Unable to parse the JSON body.", 400)
  }

  if (!body || typeof body !== "object") {
    throw new HttpError("A valid request body is required.", 400)
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
    throw new HttpError("Unable to parse the JSON body.", 400)
  }

  if (!body || typeof body !== "object") {
    throw new HttpError("A valid request body is required.", 400)
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
  return supabase.storage.from(bucket).createSignedUploadUrl(objectPath, { upsert: false })
}

const requireAuthenticatedUser = async (supabase: RouteSupabaseClient): Promise<User> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    const isMissingSession = /Auth session missing/i.test(error.message)
    if (isMissingSession) {
      throw new HttpError("You must be signed in.", 401)
    }
    throw new Error(`Unable to load Supabase auth information: ${error.message}`)
  }
  if (!user) {
    throw new HttpError("You must be signed in.", 401)
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
    throw new Error(`Unable to fetch pattern information: ${error.message}`)
  }

  if (!data) {
    throw new HttpError("Pattern information was not found.", 404)
  }

  return data.workspace_id as string
}

const ensureWorkspaceEditorRole = async (supabase: RouteSupabaseClient, workspaceId: string) => {
  const { data, error } = await supabase.rpc("workspace_has_min_role", {
    target_workspace_id: workspaceId,
    min_role: "editor",
  })

  if (error) {
    throw new Error(`Unable to verify workspace permissions: ${error.message}`)
  }

  if (data !== true) {
    throw new HttpError("You do not have permission to upload captures.", 403)
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
    throw new Error(`Unable to compute the next capture sort value: ${error.message}`)
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

  // TODO(@server-actions): wire up a Server Action/job to populate width/height, poster_storage_path, etc. after uploads finish

  if (error) {
    if (error.code === "23505") {
      throw new HttpError("A capture with this ID already exists.", 409)
    }
    throw new Error(`Failed to create the capture record: ${error.message}`)
  }

  return data as CaptureRecord
}

const deleteCaptureRecord = async (
  supabase: RouteSupabaseClient,
  patternId: string,
  captureId: string,
): Promise<CaptureRecord & { poster_storage_path: string | null }> => {
  const { data: target, error: lookupError } = await supabase
    .from("captures")
    .select("id, pattern_id, storage_path, poster_storage_path, media_type, mime_type, order_index, created_at")
    .eq("id", captureId)
    .eq("pattern_id", patternId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Unable to look up the capture targeted for deletion: ${lookupError.message}`)
  }

  if (!target) {
    throw new HttpError("The capture to delete could not be found.", 404)
  }

  const { error: deleteError } = await supabase
    .from("captures")
    .delete()
    .eq("id", captureId)
    .eq("pattern_id", patternId)

  if (deleteError) {
    throw new Error(`Failed to delete the capture record: ${deleteError.message}`)
  }

  return target as CaptureRecord & { poster_storage_path: string | null }
}

const removeStorageObjectIfExists = async (bucket: string, storagePath: string) => {
  const supabase = getServiceRoleSupabaseClient()
  const { error } = await supabase.storage.from(bucket).remove([storagePath])
  if (error) {
    // Errors can occur even if the object no longer exists. Since this handler is only used for retries, treat failures as non-fatal.
    console.warn(`[captures/upload] Failed to delete storage object (${storagePath})`, error.message)
  }
}

export const runtime = "nodejs"

const postHandler = async (request: Request) => {
  try {
    const payload = await parseRequest(request)
    const supabase = await createSupabaseRouteHandlerClient()
    const user = await requireAuthenticatedUser(supabase)
    const bucket = resolveBucketName()
    const objectPath = resolveObjectPath(payload)

    const patternWorkspaceId = await fetchPatternWorkspaceId(supabase, payload.patternId)

    if (patternWorkspaceId !== payload.workspaceId) {
      throw new HttpError("workspaceId does not match the pattern information.", 400)
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
      throw new Error(error?.message || "Unable to create the Supabase Storage signed URL.")
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
    console.error("[captures/upload] Processing failed", error)
    return NextResponse.json({ error: "An error occurred while creating the upload URL." }, { status: 500 })
  }
}

const deleteHandler = async (request: Request) => {
  try {
    const payload = await parseCancelRequest(request)
    const supabase = await createSupabaseRouteHandlerClient()
    await requireAuthenticatedUser(supabase)
    const bucket = resolveBucketName()

    const patternWorkspaceId = await fetchPatternWorkspaceId(supabase, payload.patternId)

    if (patternWorkspaceId !== payload.workspaceId) {
      throw new HttpError("workspaceId does not match the pattern information.", 400)
    }

    await ensureWorkspaceEditorRole(supabase, payload.workspaceId)
    const deletedCapture = await deleteCaptureRecord(supabase, payload.patternId, payload.captureId)

    await removeStorageObjectIfExists(bucket, deletedCapture.storage_path)
    if (deletedCapture.poster_storage_path) {
      await removeStorageObjectIfExists(bucket, deletedCapture.poster_storage_path)
    }

    return NextResponse.json({
      deletedCaptureId: deletedCapture.id,
      storagePath: deletedCapture.storage_path,
      message: "Upload was canceled and the capture record was cleaned up.",
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[captures/upload] Failed to process upload cancellation", error)
    return NextResponse.json({ error: "An error occurred while processing the upload cancellation." }, { status: 500 })
  }
}

export const POST = withApiErrorReporting(postHandler, { name: "captures-upload" })
export const DELETE = withApiErrorReporting(deleteHandler, { name: "captures-upload-cancel" })
