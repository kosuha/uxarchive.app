import { NextResponse } from "next/server"

import { lemonSqueezyBilling } from "@/lib/billing-config"
import { createLemonSqueezyCheckout } from "@/lib/lemonsqueezy"
import { isPaidPlanActive } from "@/lib/plan-limits"
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

    const requestedPlanCode =
      typeof body.planCode === "string" ? body.planCode.trim() : undefined
    const planCode = requestedPlanCode || lemonSqueezyBilling.plans.plus.code

    if (requestedPlanCode && requestedPlanCode !== lemonSqueezyBilling.plans.plus.code) {
      return NextResponse.json({ error: "unsupported_plan" }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan_code, plan_status, ls_subscription_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Checkout blocked: failed to load profile", profileError)
      return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 })
    }

    if (profile && isPaidPlanActive(profile.plan_code, profile.plan_status)) {
      return NextResponse.json(
        {
          error: "already_subscribed",
          message:
            "You're already on the Plus plan. Manage or change your subscription in the customer portal.",
        },
        { status: 409 },
      )
    }

    const url = await createLemonSqueezyCheckout({
      email: typeof body.email === "string" ? body.email : undefined,
      redirectUrl: successRedirectUrl,
      userId: user.id,
      planCode,
      metadata:
        body && typeof body === "object" && !Array.isArray(body)
          ? (body.metadata as Record<string, unknown> | undefined)
          : undefined,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("LemonSqueezy checkout creation failed", error)
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 })
  }
}
