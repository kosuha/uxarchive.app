import { NextResponse } from "next/server"

import { cancelLemonSqueezySubscription } from "@/lib/lemonsqueezy"
import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

export const runtime = "nodejs"

const handler = async (_request: Request) => {
  try {
    const supabase = await createSupabaseRouteHandlerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ls_subscription_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Failed to load profile before delete", profileError)
      return NextResponse.json({ error: "profile_lookup_failed" }, { status: 500 })
    }

    const subscriptionId = (profile as { ls_subscription_id?: string | null })
      ?.ls_subscription_id

    if (subscriptionId) {
      try {
        await cancelLemonSqueezySubscription(subscriptionId)
      } catch (error) {
        console.error("Failed to cancel LemonSqueezy subscription before delete", error)
        return NextResponse.json({ error: "subscription_cancel_failed" }, { status: 502 })
      }
    }

    const serviceClient = getServiceRoleSupabaseClient()

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error("Failed to delete user", deleteError)
      return NextResponse.json({ error: "delete_failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account deletion failed", error)
    return NextResponse.json({ error: "account_delete_failed" }, { status: 500 })
  }
}

export const DELETE = withApiErrorReporting(handler, { name: "account-delete" })
