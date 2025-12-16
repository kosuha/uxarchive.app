import type { SupabaseClient } from "@supabase/supabase-js";

import { RepositoryError } from "./repositories/types";

export type PlanCode = "free" | "plus";
export type PlanStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | string;

export type PlanLimitConfig = {
  code: PlanCode;
  maxPatterns: number;
  maxPrivatePatterns: number;
  maxRepositories: number;
  maxPrivateRepositories: number;
  allowPublicSharing: boolean;
  allowDownloads: boolean;
  allowFork: boolean;
};

export type PlanWithLimits = {
  code: PlanCode;
  status: PlanStatus;
  limits: PlanLimitConfig;
};

export const planLimits: Record<PlanCode, PlanLimitConfig> = {
  free: {
    code: "free",
    maxPatterns: Infinity,
    maxPrivatePatterns: 3,
    maxRepositories: Infinity,
    maxPrivateRepositories: 3,
    allowPublicSharing: true,
    allowDownloads: false,
    allowFork: false,
  },
  plus: {
    code: "plus",
    maxPatterns: Infinity,
    maxPrivatePatterns: Infinity,
    maxRepositories: Infinity,
    maxPrivateRepositories: Infinity,
    allowPublicSharing: true,
    allowDownloads: true,
    allowFork: true,
  },
};

const PAID_STATUSES: PlanStatus[] = ["active", "trialing"];
const DEFAULT_PLAN_CODE: PlanCode = "free";

export const normalizePlanCode = (planCode?: string | null): PlanCode => {
  const normalized = (planCode ?? "").toLowerCase();
  return normalized === "plus" ? "plus" : DEFAULT_PLAN_CODE;
};

export const normalizePlanStatus = (planStatus?: string | null): PlanStatus => {
  const normalized = (planStatus ?? "active").toLowerCase();
  return normalized || "active";
};

export const resolveEffectivePlan = (
  planCode?: string | null,
  planStatus?: string | null,
): PlanCode => {
  const normalizedCode = normalizePlanCode(planCode);
  const normalizedStatus = normalizePlanStatus(planStatus);

  if (
    normalizedCode !== DEFAULT_PLAN_CODE &&
    PAID_STATUSES.includes(normalizedStatus)
  ) {
    return normalizedCode;
  }

  return DEFAULT_PLAN_CODE;
};

export const isPaidPlanActive = (
  planCode?: string | null,
  planStatus?: string | null,
) => {
  return resolveEffectivePlan(planCode, planStatus) !== DEFAULT_PLAN_CODE;
};

export const loadPlanWithLimits = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanWithLimits> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan_code, plan_status")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(`Failed to load profile: ${error.message}`, {
      cause: error,
      code: (error as { code?: string }).code,
    });
  }

  if (!data) {
    throw new RepositoryError("User profile not found.", { status: 404 });
  }

  const planCode = resolveEffectivePlan(
    (data as { plan_code?: string | null }).plan_code,
    (data as { plan_status?: string | null }).plan_status,
  );

  return {
    code: planCode,
    status: normalizePlanStatus(
      (data as { plan_status?: string | null }).plan_status,
    ),
    limits: planLimits[planCode] ?? planLimits[DEFAULT_PLAN_CODE],
  };
};

const normalizeCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export const assertPatternLimit = (params: {
  usageCount: number;
  plan: PlanWithLimits;
}) => {
  const limit = params.plan.limits.maxPatterns;
  if (limit > 0 && params.usageCount >= limit) {
    const message = params.plan.code === "free"
      ? `You can save up to ${limit} patterns on the free plan. Upgrade to add more.`
      : `You exceeded the pattern limit (${limit}) for your current plan. Remove unused patterns or adjust your plan.`;

    throw new RepositoryError(message, { status: 403 });
  }
};

export const ensurePatternCreationAllowed = async (
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
) => {
  const plan = await loadPlanWithLimits(supabase, userId);
  const { count, error } = await supabase
    .from("patterns")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new RepositoryError(
      `Failed to fetch pattern count: ${error.message}`,
      {
        cause: error,
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
      },
    );
  }

  const usageCount = normalizeCount(count);
  assertPatternLimit({ usageCount, plan });

  return { plan, usageCount };
};

export const ensurePrivatePatternAllowed = async (
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
) => {
  const plan = await loadPlanWithLimits(supabase, userId);
  const limit = plan.limits.maxPrivatePatterns;

  // If limit is Infinity, no need to check
  if (!Number.isFinite(limit)) {
    return plan;
  }

  // Count existing PRIVATE patterns
  const { count, error } = await supabase
    .from("patterns")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_public", false)
    .eq("is_archived", false);

  if (error) {
    throw new RepositoryError(
      `Failed to fetch private pattern count: ${error.message}`,
      {
        cause: error,
        code: (error as { code?: string }).code,
      },
    );
  }

  const usageCount = normalizeCount(count);

  if (usageCount >= limit) {
    throw new RepositoryError(
      `Free plan allows only ${limit} private patterns. Please make some patterns public or upgrade.`,
      { status: 403 },
    );
  }

  return plan;
};

// --- Repository Limits (V2) ---

export const assertRepositoryLimit = (params: {
  usageCount: number;
  plan: PlanWithLimits;
}) => {
  const limit = params.plan.limits.maxRepositories;
  if (limit > 0 && params.usageCount >= limit) {
    const message = params.plan.code === "free"
      ? `You can save up to ${limit} repositories on the free plan. Upgrade to add more.`
      : `You exceeded the repository limit (${limit}) for your current plan. Remove unused repositories or adjust your plan.`;

    throw new RepositoryError(message, { status: 403 });
  }
};

export const ensureRepositoryCreationAllowed = async (
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
) => {
  const plan = await loadPlanWithLimits(supabase, userId);
  const { count, error } = await supabase
    .from("repositories")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new RepositoryError(
      `Failed to fetch repository count: ${error.message}`,
      {
        cause: error,
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
      },
    );
  }

  const usageCount = normalizeCount(count);
  assertRepositoryLimit({ usageCount, plan });

  return { plan, usageCount };
};

export const ensurePrivateRepositoryAllowed = async (
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
) => {
  const plan = await loadPlanWithLimits(supabase, userId);
  const limit = plan.limits.maxPrivateRepositories;

  if (!Number.isFinite(limit)) {
    return plan;
  }

  const { count, error } = await supabase
    .from("repositories")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_public", false);

  if (error) {
    throw new RepositoryError(
      `Failed to fetch private repository count: ${error.message}`,
      {
        cause: error,
        code: (error as { code?: string }).code,
      },
    );
  }

  const usageCount = normalizeCount(count);

  if (usageCount >= limit) {
    throw new RepositoryError(
      `Free plan allows only ${limit} private repositories. Please make some repositories public or upgrade to Plus.`,
      { status: 403 },
    );
  }

  return plan;
};

export const ensureSharingAllowed = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanWithLimits> => {
  const plan = await loadPlanWithLimits(supabase, userId);
  if (!plan.limits.allowPublicSharing) {
    throw new RepositoryError(
      "Sharing links are only available on the Plus plan. Please upgrade.",
      { status: 403 },
    );
  }
  return plan;
};

export const ensureDownloadAllowed = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanWithLimits> => {
  const plan = await loadPlanWithLimits(supabase, userId);
  if (!plan.limits.allowDownloads) {
    throw new RepositoryError(
      "Image downloads are only available on the Plus plan. Upgrade and try again.",
      { status: 403 },
    );
  }
  return plan;
};

export const ensureForkAllowed = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanWithLimits> => {
  const plan = await loadPlanWithLimits(supabase, userId);
  if (!plan.limits.allowFork) {
    throw new RepositoryError(
      "Forking is only available on the Plus plan. Upgrade and try again.",
      { status: 403 },
    );
  }
  return plan;
};
