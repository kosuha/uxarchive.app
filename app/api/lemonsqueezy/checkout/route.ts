import { NextResponse } from "next/server"

import { createLemonSqueezyCheckout } from "@/lib/lemonsqueezy"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) ?? {}
  } catch {
    // Allow empty body
  }

  try {
    const supabase = await createSupabaseRouteHandlerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const requestUrl = new URL(request.url)
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${requestUrl.origin}`
    const successRedirectUrl = `${origin}/workspace`

    const url = await createLemonSqueezyCheckout({
      email: typeof body.email === "string" ? body.email : undefined,
      redirectUrl: successRedirectUrl,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("LemonSqueezy checkout creation failed", error)
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 })
  }
}
