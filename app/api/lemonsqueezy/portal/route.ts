import { NextResponse } from "next/server"

import { getLemonSqueezySubscription } from "@/lib/lemonsqueezy"
import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

export const runtime = "nodejs"

const handler = async (request: Request) => {
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
      .select("ls_customer_id, ls_subscription_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Failed to load profile for portal", profileError)
      return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 })
    }

    const customerId = profile?.ls_customer_id
    const subscriptionId = profile?.ls_subscription_id
    if (!customerId) {
      return NextResponse.json({ error: "no_customer" }, { status: 404 })
    }

    if (!subscriptionId) {
      return NextResponse.json({ error: "no_subscription" }, { status: 404 })
    }

    // Fetch the signed customer_portal URL from the subscription on every request (valid for 24h)
    try {
      const subscription = await getLemonSqueezySubscription(subscriptionId)
      const urls = (subscription.data?.attributes as { urls?: { customer_portal?: string } })?.urls
      const signedPortalUrl =
        urls && typeof urls.customer_portal === "string"
          ? urls.customer_portal
          : null

      if (signedPortalUrl) {
        return NextResponse.json({ url: signedPortalUrl })
      }
    } catch (error) {
      console.warn("Failed to fetch subscription for portal", error)
    }

    return NextResponse.json({ error: "portal_unavailable" }, { status: 502 })
  } catch (error) {
    console.error("LemonSqueezy portal creation failed", error)
    return NextResponse.json({ error: "portal_failed" }, { status: 500 })
  }
}

export const GET = withApiErrorReporting(handler, { name: "lemonsqueezy-portal" })
