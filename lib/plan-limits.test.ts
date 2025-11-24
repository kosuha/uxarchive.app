import { describe, expect, it } from "vitest"

import {
  assertPatternLimit,
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
  it("기본값이 없으면 free로 처리한다", () => {
    expect(resolveEffectivePlan(undefined, undefined)).toBe("free")
  })

  it("유효한 유료 플랜과 active/trialing 상태는 그대로 유지한다", () => {
    expect(resolveEffectivePlan("plus", "active")).toBe("plus")
    expect(resolveEffectivePlan("plus", "trialing")).toBe("plus")
  })

  it("past_due/canceled 상태는 무료 플랜으로 강등된다", () => {
    expect(resolveEffectivePlan("plus", "past_due")).toBe("free")
    expect(resolveEffectivePlan("plus", "canceled")).toBe("free")
  })

  it("알 수 없는 코드도 안전하게 free로 처리한다", () => {
    expect(resolveEffectivePlan("enterprise", "active")).toBe("free")
  })
})

describe("assertPatternLimit", () => {
  it("한도 미만이면 통과시킨다", () => {
    const plan = makePlan("free")
    expect(() => assertPatternLimit({ usageCount: 4, plan })).not.toThrow()
  })

  it("무료 플랜에서 한도를 초과하면 403 오류를 던진다", () => {
    const plan = makePlan("free")
    expect(() => assertPatternLimit({ usageCount: plan.limits.maxPatterns, plan })).toThrowError(
      /무료 플랜/,
    )
  })

  it("유료 플랜도 설정된 한도를 초과하면 차단한다", () => {
    const plan = makePlan("plus")
    expect(() => assertPatternLimit({ usageCount: plan.limits.maxPatterns, plan })).toThrowError(
      /한도/,
    )
  })

  it("유료 플랜이 한도 미만이면 통과한다", () => {
    const plan = makePlan("plus")
    expect(() => assertPatternLimit({ usageCount: plan.limits.maxPatterns - 1, plan })).not.toThrow()
  })
})

describe("ensureDownloadAllowed", () => {
  it("무료 플랜에서는 다운로드를 막는다", async () => {
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

    await expect(ensureDownloadAllowed(supabaseMock, "user-1")).rejects.toThrow(/다운로드는 Plus/)
  })
})
