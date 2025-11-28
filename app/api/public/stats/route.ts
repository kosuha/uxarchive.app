import { NextResponse } from "next/server"

import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handler = async () => {
  try {
    const supabase = getServiceRoleSupabaseClient()
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })

    if (error) {
      console.error("Failed to count profiles", error)
      return NextResponse.json({ error: "stats_unavailable" }, { status: 500 })
    }

    const response = NextResponse.json({ userCount: count ?? 0 })
    response.headers.set("Cache-Control", "public, max-age=300")
    return response
  } catch (error) {
    console.error("Unexpected stats failure", error)
    return NextResponse.json({ error: "stats_unavailable" }, { status: 500 })
  }
}

export const GET = withApiErrorReporting(handler, { name: "public-stats", sampleRate: 0.25 })
