import { NextResponse } from "next/server"

import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-clients"

export const runtime = "nodejs"

export async function DELETE() {
  try {
    const supabase = await createSupabaseRouteHandlerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
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
