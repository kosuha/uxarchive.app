import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { buildDiscordPayload, notifyDiscord, postDiscord } from "./discord"

const originalEnv = { ...process.env }
const originalFetch = global.fetch

const resetEnv = () => {
  // Remove test-added keys and restore originals
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, originalEnv)
}

const createResponse = (status: number, ok: boolean, body = "") =>
  ({
    ok,
    status,
    text: vi.fn().mockResolvedValue(body),
  }) as unknown as Response

describe("buildDiscordPayload", () => {
  beforeEach(() => {
    resetEnv()
    global.fetch = originalFetch
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetEnv()
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it("maps severity/type to embed color and includes context fields", () => {
    const payload = buildDiscordPayload({
      type: "payment",
      title: "Payment captured",
      message: "Invoice paid",
      severity: "success",
      timestamp: "2024-01-01T00:00:00.000Z",
      workspaceId: "ws-123",
      userId: "user-456",
      context: { amount: 100, currency: "USD" },
    })

    const embed = payload.embeds[0]
    expect(embed.color).toBe(0x57f287)
    expect(embed.title).toBe("Payment captured")
    expect(embed.timestamp).toBe("2024-01-01T00:00:00.000Z")
    expect(embed.fields?.find((field) => field.name === "Type")?.value).toBe("payment")
    expect(embed.fields?.find((field) => field.name === "Workspace")?.value).toBe("ws-123")
    expect(embed.fields?.find((field) => field.name === "User")?.value).toBe("user-456")
    expect(embed.fields?.find((field) => field.name === "Context")?.value).toContain("amount")
  })

  it("falls back to severity color when provided", () => {
    const payload = buildDiscordPayload({
      type: "info",
      severity: "critical",
      title: "Outage detected",
    })

    expect(payload.embeds[0].color).toBe(0xed4245)
  })
})

describe("postDiscord", () => {
  beforeEach(() => {
    resetEnv()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    resetEnv()
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it("retries on retryable responses before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(429, false, "rate limited"))
      .mockResolvedValueOnce(createResponse(204, true))

    global.fetch = fetchMock as typeof fetch

    await postDiscord("https://example.com/webhook", { embeds: [] }, { retries: 1, timeoutMs: 100 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("throws after exhausting retries on server errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(500, false, "server error"))
    global.fetch = fetchMock as typeof fetch

    await expect(
      postDiscord("https://example.com/webhook", { embeds: [] }, { retries: 1, timeoutMs: 100 }),
    ).rejects.toThrow(/500/)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("aborts when the request exceeds the timeout budget", async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((_, init?: RequestInit) => {
      const { signal } = init ?? {}
      return new Promise<Response>((resolve) => {
        signal?.addEventListener("abort", () => {
          resolve(createResponse(499, false, "aborted by timeout"))
        })
      })
    })

    global.fetch = fetchMock as typeof fetch

    const promise = postDiscord("https://example.com/webhook", { embeds: [] }, { retries: 1, timeoutMs: 50 })
    const expectation = expect(promise).rejects.toThrow(/499/)

    await vi.advanceTimersByTimeAsync(50) // abort first attempt
    await vi.advanceTimersByTimeAsync(500) // wait backoff before retry
    await vi.advanceTimersByTimeAsync(50) // abort second attempt

    await expectation
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe("notifyDiscord", () => {
  beforeEach(() => {
    resetEnv()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    resetEnv()
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it("skips sending when notifications are disabled", async () => {
    process.env.DISCORD_NOTIFY_ENABLED = "false"
    process.env.NODE_ENV = "production"
    const fetchMock = vi.fn()
    global.fetch = fetchMock as typeof fetch

    const sent = await notifyDiscord(
      { type: "error", title: "Something failed" },
      { webhookOverride: "https://example.com/webhook" },
    )

    expect(sent).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
