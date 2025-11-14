import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

const DEFAULT_BUCKET = "ux-archive-captures"

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

type RouteSupabaseClient = SupabaseClient

const resolveBucketName = (explicit?: string | null) =>
  explicit?.trim() || process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET

const sanitizeObjectPath = (value: string | null) => {
  if (!value) {
    throw new HttpError("path 쿼리 파라미터가 필요합니다.", 400)
  }
  const normalized = value.replace(/^\/+/, "")
  if (!normalized) {
    throw new HttpError("path 값이 올바르지 않습니다.", 400)
  }
  if (normalized.includes("..")) {
    throw new HttpError("path 값에 허용되지 않는 문자가 포함되어 있습니다.", 400)
  }
  return normalized
}

const requireAuthenticatedUser = async (supabase: RouteSupabaseClient): Promise<void> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    const isMissingSession = /Auth session missing/i.test(error.message)
    if (isMissingSession) {
      throw new HttpError("로그인이 필요합니다.", 401)
    }
    throw new Error(`Supabase 인증 정보를 확인할 수 없습니다: ${error.message}`)
  }

  if (!user) {
    throw new HttpError("로그인이 필요합니다.", 401)
  }

  return user
}

export const GET = async (request: Request) => {
  try {
    const url = new URL(request.url)
    const objectPath = sanitizeObjectPath(url.searchParams.get("path"))
    const bucket = resolveBucketName(url.searchParams.get("bucket"))

    const supabase = (await createSupabaseRouteHandlerClient()) as RouteSupabaseClient
    await requireAuthenticatedUser(supabase)

    const { data, error } = await supabase.storage.from(bucket).download(objectPath)
    if (error || !data) {
      if (error?.statusCode === "404" || error?.statusCode === 404) {
        throw new HttpError("요청한 객체를 찾을 수 없습니다.", 404)
      }
      throw new Error(error?.message || "스토리지 객체를 다운로드하지 못했습니다.")
    }

    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const headers = new Headers({
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
      "Content-Length": buffer.byteLength.toString(),
    })

    return new NextResponse(buffer, { headers })
  } catch (caught) {
    if (caught instanceof HttpError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status })
    }
    console.error("[storage-object] download failed", caught)
    return NextResponse.json({ error: "스토리지 객체를 전달하지 못했습니다." }, { status: 500 })
  }
}
