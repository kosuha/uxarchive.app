import { NextResponse } from "next/server"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

const handler = async (request: Request) => {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  // 기본 리디렉션을 /workspace로 지정해 로그인 이후 워크스페이스로 이동
  const next = requestUrl.searchParams.get("next") ?? "/workspace"

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}

export const GET = handler
export const POST = handler
