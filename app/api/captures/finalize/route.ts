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
    throw new Error("요청 본문을 파싱할 수 없습니다.")
  }

  if (!body || typeof body !== "object") {
    throw new Error("유효한 JSON 본문이 필요합니다.")
  }

  const payload = body as Record<string, unknown>

  const requireString = (value: unknown, key: string) => {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`${key} 값이 필요합니다.`)
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
    throw new Error("width/height 값은 숫자여야 합니다.")
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
    console.error("[captures/finalize] 처리 실패", error)
    const message = error instanceof Error ? error.message : "캡처 정보를 갱신하지 못했습니다."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export const runtime = "nodejs"
