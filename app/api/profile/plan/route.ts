import { NextResponse } from "next/server"

import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"
import { resolveEffectivePlan } from "@/lib/plan-limits"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

export const runtime = "nodejs"

const PROFILE_COLUMNS =
  "plan_code, plan_status, renewal_at, cancel_at, ls_customer_id, ls_subscription_id"

const handler = async (_request: Request) => {
  void _request
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
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Failed to load plan info", profileError)
      return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 })
    }

    const effectivePlan = resolveEffectivePlan(profile?.plan_code, profile?.plan_status)

    return NextResponse.json({
      planCode: profile?.plan_code ?? "free",
      planStatus: profile?.plan_status ?? "active",
      effectivePlan,
      renewalAt: profile?.renewal_at,
      cancelAt: profile?.cancel_at,
      hasSubscription: Boolean(profile?.ls_subscription_id),
      hasCustomer: Boolean(profile?.ls_customer_id),
    })
  } catch (caught) {
    console.error("Plan lookup failed", caught)
    return NextResponse.json({ error: "plan_lookup_failed" }, { status: 500 })
  }
}

export const GET = withApiErrorReporting(handler, { name: "profile-plan" })
