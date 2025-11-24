import { NextResponse } from "next/server"
import type { SupabaseClient, User } from "@supabase/supabase-js"

import { ensureDownloadAllowed } from "@/lib/plan-limits"
import { RepositoryError } from "@/lib/repositories/types"
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

const isNotFoundStorageError = (error: unknown) => {
  if (!error || typeof error !== "object") return false
  const withCodes = error as { statusCode?: string | number; status?: string | number }
  return (
    withCodes.statusCode === "404" ||
    withCodes.statusCode === 404 ||
    withCodes.status === 404
  )
}

const sanitizeObjectPath = (value: string | null) => {
  if (!value) {
    throw new HttpError("The path query parameter is required.", 400)
  }
  const normalized = value.replace(/^\/+/, "")
  if (!normalized) {
    throw new HttpError("The path value is invalid.", 400)
  }
  if (normalized.includes("..")) {
    throw new HttpError("The path value contains disallowed characters.", 400)
  }
  return normalized
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
    throw new Error(`Unable to load Supabase auth info: ${error.message}`)
  }

  if (!user) {
    throw new HttpError("You must be signed in.", 401)
  }

  return user
}

export const GET = async (request: Request) => {
  try {
    const url = new URL(request.url)
    const objectPath = sanitizeObjectPath(url.searchParams.get("path"))
    const bucket = resolveBucketName(url.searchParams.get("bucket"))

    const supabase = (await createSupabaseRouteHandlerClient()) as RouteSupabaseClient
    const user = await requireAuthenticatedUser(supabase)
    await ensureDownloadAllowed(supabase, user.id)

    const { data, error } = await supabase.storage.from(bucket).download(objectPath)
    if (error || !data) {
      if (isNotFoundStorageError(error)) {
        throw new HttpError("The requested object was not found.", 404)
      }
      throw new Error(error?.message || "Failed to download the storage object.")
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
    if (caught instanceof RepositoryError && caught.status) {
      return NextResponse.json({ error: caught.message }, { status: caught.status })
    }
    console.error("[storage-object] download failed", caught)
    return NextResponse.json({ error: "Failed to proxy the storage object." }, { status: 500 })
  }
}
