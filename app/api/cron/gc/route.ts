import { NextResponse } from "next/server"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const supabase = getServiceRoleSupabaseClient()
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "ux-archive-captures"

  // 1. Get orphans
  const { data, error: rpcError } = await supabase.rpc("get_orphaned_assets", { limit_count: 50 } as any)
  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const orphans = data as { id: string; storage_path: string }[] | null

  if (!orphans || orphans.length === 0) {
    return NextResponse.json({ processed: 0, message: "No orphaned assets found." })
  }

  // 2. Delete files and records
  const storagePaths = orphans.map((o) => o.storage_path)
  
  const { error: storageError } = await supabase.storage.from(bucket).remove(storagePaths)
  
  if (storageError) {
      return NextResponse.json({ error: "Storage delete failed", details: storageError }, { status: 500 })
  }

  // DB Delete
  const idsToDelete = orphans.map((o: { id: string }) => o.id)
  const { error: dbError } = await supabase.from("storage_assets").delete().in("id", idsToDelete)

  if (dbError) {
      return NextResponse.json({ error: "DB delete failed", details: dbError }, { status: 500 })
  }

  return NextResponse.json({
    processed: orphans.length,
    deletedIds: idsToDelete,
    message: "GC completed successfully."
  })
}
