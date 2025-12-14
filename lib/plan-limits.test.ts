import { describe, expect, it } from "vitest"

import {
  assertPatternLimit,
  isPaidPlanActive,
  ensureDownloadAllowed,
  ensureForkAllowed,
  planLimits,
  resolveEffectivePlan,
  type PlanWithLimits,
  type PlanCode,
  type PlanStatus,
} from "./plan-limits"

const makePlan = (code: PlanCode, status: PlanStatus = "active"): PlanWithLimits => ({
  code,
  status,
  limits: { ...planLimits[code] },
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
    // Mock a finite limit for testing logic
    plan.limits.maxPatterns = 10
    expect(() => assertPatternLimit({ usageCount: 4, plan })).not.toThrow()
  })

  it("throws 403 when free plan exceeds its limit", () => {
    const plan = makePlan("free")
    plan.limits.maxPatterns = 5
    expect(() => assertPatternLimit({ usageCount: 5, plan })).toThrowError(
      /free plan/i,
    )
  })

  it("blocks paid plans that exceed the configured limit", () => {
    const plan = makePlan("plus")
    plan.limits.maxPatterns = 100
    expect(() => assertPatternLimit({ usageCount: 100, plan })).toThrowError(
      /limit/i,
    )
  })

  it("allows paid plans with infinite limit", () => {
    const plan = makePlan("plus")
    // plus has Infinity by default
    expect(() => assertPatternLimit({ usageCount: 1000000, plan })).not.toThrow()
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

describe("ensureForkAllowed", () => {
  it("blocks forking on the free plan", async () => {
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

    await expect(ensureForkAllowed(supabaseMock, "user-1")).rejects.toThrow(/only available on the Plus plan/i)
  })

  it("allows forking on the plus plan", async () => {
    const plan = makePlan("plus")
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

    await expect(ensureForkAllowed(supabaseMock, "user-1")).resolves.not.toThrow()
  })
})
