import { NextResponse } from "next/server"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"
import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"

const handler = async (request: Request) => {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  // Default redirect to /workspace after login
  const next = requestUrl.searchParams.get("next") ?? "/workspace"

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}

export const GET = withApiErrorReporting(handler, { name: "auth-callback" })
export const POST = withApiErrorReporting(handler, { name: "auth-callback" })
