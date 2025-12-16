"use server";

import {
    createActionSupabaseClient,
    requireAuthenticatedUser,
} from "./_workspace-guards";
import { loadPlanWithLimits, type PlanWithLimits } from "@/lib/plan-limits";

export type PlanLimitsResponse = {
    plan: PlanWithLimits;
    usage: {
        repositories: number;
        privateRepositories: number;
    };
};

const normalizeCount = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

export async function getPlanLimitsAction(
    workspaceId: string,
): Promise<PlanLimitsResponse> {
    const supabase = await createActionSupabaseClient();
    const user = await requireAuthenticatedUser(supabase);

    const plan = await loadPlanWithLimits(supabase, user.id);

    // Fetch usage counts
    // Total repos
    const { count: totalCount } = await supabase
        .from("repositories")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

    // Private repos
    const { count: privateCount } = await supabase
        .from("repositories")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_public", false);

    return {
        plan,
        usage: {
            repositories: normalizeCount(totalCount),
            privateRepositories: normalizeCount(privateCount),
        },
    };
}
