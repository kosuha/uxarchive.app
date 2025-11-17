import { NextResponse } from "next/server"

import { finalizeCaptureUpload } from "@/app/actions/captures"

type FinalizePayload = {
  workspaceId: string
  patternId: string
  captureId: string
  width?: number | null
  height?: number | null
  posterStoragePath?: string | null
  refreshPublicUrl?: boolean
}

const parseRequest = async (request: Request): Promise<FinalizePayload> => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new Error("Unable to parse the request body.")
  }

  if (!body || typeof body !== "object") {
    throw new Error("A valid JSON body is required.")
  }

  const payload = body as Record<string, unknown>

  const requireString = (value: unknown, key: string) => {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`The ${key} value is required.`)
    }
    return value
  }

  const optionalNumber = (value: unknown) => {
    if (typeof value === "number") return value
    if (value === null || typeof value === "undefined") return undefined
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }
    throw new Error("The width/height values must be numbers.")
  }

  return {
    workspaceId: requireString(payload.workspaceId, "workspaceId"),
    patternId: requireString(payload.patternId, "patternId"),
    captureId: requireString(payload.captureId, "captureId"),
    width: optionalNumber(payload.width),
    height: optionalNumber(payload.height),
    posterStoragePath:
      typeof payload.posterStoragePath === "string" || payload.posterStoragePath === null
        ? (payload.posterStoragePath as string | null | undefined)
        : undefined,
    refreshPublicUrl:
      typeof payload.refreshPublicUrl === "boolean" ? payload.refreshPublicUrl : undefined,
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseRequest(request)
    const capture = await finalizeCaptureUpload(payload)
    return NextResponse.json({ capture })
  } catch (error) {
    console.error("[captures/finalize] Processing failed", error)
    const message = error instanceof Error ? error.message : "Failed to update capture information."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export const runtime = "nodejs"
