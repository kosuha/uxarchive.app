import type { SupabaseClient } from "@supabase/supabase-js"

import { RepositoryError } from "./repositories/types"

export type PlanCode = "free" | "plus"
export type PlanStatus = "active" | "trialing" | "past_due" | "canceled" | string

export type PlanLimitConfig = {
  code: PlanCode
  maxPatterns: number
  allowPublicSharing: boolean
  allowDownloads: boolean
}

export type PlanWithLimits = {
  code: PlanCode
  status: PlanStatus
  limits: PlanLimitConfig
}

export const planLimits: Record<PlanCode, PlanLimitConfig> = {
  free: { code: "free", maxPatterns: 5, allowPublicSharing: false, allowDownloads: false },
  plus: { code: "plus", maxPatterns: 30, allowPublicSharing: true, allowDownloads: true },
}

const PAID_STATUSES: PlanStatus[] = ["active", "trialing"]
const DEFAULT_PLAN_CODE: PlanCode = "free"

export const normalizePlanCode = (planCode?: string | null): PlanCode => {
  const normalized = (planCode ?? "").toLowerCase()
  return normalized === "plus" ? "plus" : DEFAULT_PLAN_CODE
}

export const normalizePlanStatus = (planStatus?: string | null): PlanStatus => {
  const normalized = (planStatus ?? "active").toLowerCase()
  return normalized || "active"
}

export const resolveEffectivePlan = (
  planCode?: string | null,
  planStatus?: string | null,
): PlanCode => {
  const normalizedCode = normalizePlanCode(planCode)
  const normalizedStatus = normalizePlanStatus(planStatus)

  if (normalizedCode !== DEFAULT_PLAN_CODE && PAID_STATUSES.includes(normalizedStatus)) {
    return normalizedCode
  }

  return DEFAULT_PLAN_CODE
}

export const isPaidPlanActive = (planCode?: string | null, planStatus?: string | null) => {
  return resolveEffectivePlan(planCode, planStatus) !== DEFAULT_PLAN_CODE
}

export const loadPlanWithLimits = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanWithLimits> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan_code, plan_status")
    .eq("id", userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new RepositoryError(`프로필을 불러올 수 없어요: ${error.message}`, {
      cause: error,
      code: (error as { code?: string }).code,
    })
  }

  if (!data) {
    throw new RepositoryError("사용자 프로필을 찾을 수 없어요.", { status: 404 })
  }

  const planCode = resolveEffectivePlan(
    (data as { plan_code?: string | null }).plan_code,
    (data as { plan_status?: string | null }).plan_status,
  )

  return {
    code: planCode,
    status: normalizePlanStatus((data as { plan_status?: string | null }).plan_status),
    limits: planLimits[planCode] ?? planLimits[DEFAULT_PLAN_CODE],
  }
}

const normalizeCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

export const assertPatternLimit = (params: {
  usageCount: number
  plan: PlanWithLimits
}) => {
  const limit = params.plan.limits.maxPatterns
  if (limit > 0 && params.usageCount >= limit) {
    const message =
      params.plan.code === "free"
        ? `무료 플랜에서는 최대 ${limit}개의 패턴만 저장할 수 있어요. Plus로 업그레이드하면 더 추가할 수 있습니다.`
        : `현재 플랜의 패턴 한도(${limit}개)를 초과했어요. 불필요한 패턴을 정리하거나 플랜을 조정해주세요.`

    throw new RepositoryError(message, { status: 403 })
  }
}

export const ensurePatternCreationAllowed = async (
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
) => {
  const plan = await loadPlanWithLimits(supabase, userId)
  const { count, error } = await supabase
    .from("patterns")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new RepositoryError(`패턴 수를 확인할 수 없어요: ${error.message}`, {
      cause: error,
      code: (error as { code?: string }).code,
      status: (error as { status?: number }).status,
    })
  }

  const usageCount = normalizeCount(count)
  assertPatternLimit({ usageCount, plan })

  return { plan, usageCount }
}

export const ensureSharingAllowed = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanWithLimits> => {
  const plan = await loadPlanWithLimits(supabase, userId)
  if (!plan.limits.allowPublicSharing) {
    throw new RepositoryError(
      "공유 링크는 Plus 플랜에서만 사용할 수 있어요. 업그레이드를 고려해주세요.",
      { status: 403 },
    )
  }
  return plan
}

export const ensureDownloadAllowed = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanWithLimits> => {
  const plan = await loadPlanWithLimits(supabase, userId)
  if (!plan.limits.allowDownloads) {
    throw new RepositoryError(
      "이미지 다운로드는 Plus 플랜에서만 가능합니다. 업그레이드 후 다시 시도해주세요.",
      { status: 403 },
    )
  }
  return plan
}
