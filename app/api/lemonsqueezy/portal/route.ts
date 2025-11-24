import { NextResponse } from "next/server"

import { createLemonSqueezyPortal } from "@/lib/lemonsqueezy"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteHandlerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ls_customer_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Failed to load profile for portal", profileError)
      return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 })
    }

    const customerId = profile?.ls_customer_id
    if (!customerId) {
      return NextResponse.json({ error: "no_customer" }, { status: 404 })
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin
    const returnUrl = `${origin}/workspace`

    const portal = await createLemonSqueezyPortal({ customerId, returnUrl })
    const url = portal.data?.attributes?.url

    if (!url) {
      return NextResponse.json({ error: "portal_unavailable" }, { status: 502 })
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error("LemonSqueezy portal creation failed", error)
    return NextResponse.json({ error: "portal_failed" }, { status: 500 })
  }
}
