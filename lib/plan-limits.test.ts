import { describe, expect, it } from "vitest"

import {
  assertPatternLimit,
  isPaidPlanActive,
  ensureDownloadAllowed,
  planLimits,
  resolveEffectivePlan,
  type PlanWithLimits,
  type PlanCode,
  type PlanStatus,
} from "./plan-limits"

const makePlan = (code: PlanCode, status: PlanStatus = "active"): PlanWithLimits => ({
  code,
  status,
  limits: planLimits[code],
})

describe("resolveEffectivePlan", () => {
  it("returns free when no plan info is provided", () => {
    expect(resolveEffectivePlan(undefined, undefined)).toBe("free")
  })

  it("keeps a valid paid plan when status is active/trialing", () => {
    expect(resolveEffectivePlan("plus", "active")).toBe("plus")
    expect(resolveEffectivePlan("plus", "trialing")).toBe("plus")
  })

  it("downgrades past_due/canceled to free", () => {
    expect(resolveEffectivePlan("plus", "past_due")).toBe("free")
    expect(resolveEffectivePlan("plus", "canceled")).toBe("free")
  })

  it("falls back to free for unknown codes", () => {
    expect(resolveEffectivePlan("enterprise", "active")).toBe("free")
  })
})

describe("isPaidPlanActive", () => {
  it("returns false for the free plan", () => {
    expect(isPaidPlanActive("free", "active")).toBe(false)
  })

  it("returns true for paid plan + active/trialing", () => {
    expect(isPaidPlanActive("plus", "active")).toBe(true)
    expect(isPaidPlanActive("plus", "trialing")).toBe(true)
  })

  it("returns false for paid plan with past_due/canceled", () => {
    expect(isPaidPlanActive("plus", "past_due")).toBe(false)
    expect(isPaidPlanActive("plus", "canceled")).toBe(false)
  })
})

describe("assertPatternLimit", () => {
  it("allows creation below the limit", () => {
    const plan = makePlan("free")
    expect(() => assertPatternLimit({ usageCount: 4, plan })).not.toThrow()
  })

  it("throws 403 when free plan exceeds its limit", () => {
    const plan = makePlan("free")
    expect(() => assertPatternLimit({ usageCount: plan.limits.maxPatterns, plan })).toThrowError(
      /free plan/i,
    )
  })

  it("blocks paid plans that exceed the configured limit", () => {
    const plan = makePlan("plus")
    expect(() => assertPatternLimit({ usageCount: plan.limits.maxPatterns, plan })).toThrowError(
      /limit/i,
    )
  })

  it("allows paid plans below the limit", () => {
    const plan = makePlan("plus")
    expect(() => assertPatternLimit({ usageCount: plan.limits.maxPatterns - 1, plan })).not.toThrow()
  })
})

describe("ensureDownloadAllowed", () => {
  it("blocks downloads on the free plan", async () => {
    const plan = makePlan("free")
    const supabaseMock = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: { plan_code: plan.code, plan_status: plan.status },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof ensureDownloadAllowed>[0]

    await expect(ensureDownloadAllowed(supabaseMock, "user-1")).rejects.toThrow(/only available on the Plus plan/i)
  })
})
