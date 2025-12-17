import { NextResponse } from "next/server";

import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = async () => {
  try {
    const supabase = getServiceRoleSupabaseClient();
    const [profiles, repositories] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("repositories")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true),
    ]);

    if (profiles.error) {
      console.error("Failed to count profiles", profiles.error);
    }

    if (repositories.error) {
      console.error("Failed to count repositories", repositories.error);
    }

    const response = NextResponse.json({
      userCount: profiles.count ?? 0,
      repositoryCount: repositories.count ?? 0,
    });
    response.headers.set("Cache-Control", "public, max-age=300");
    return response;
  } catch (error) {
    console.error("Unexpected stats failure", error);
    return NextResponse.json({ error: "stats_unavailable" }, { status: 500 });
  }
};

export const GET = withApiErrorReporting(handler, {
  name: "public-stats",
  sampleRate: 0.25,
});
