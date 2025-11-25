import { notifyDiscord, type DiscordSeverity } from "./discord"

type Handler = (request: Request) => Promise<Response> | Response

type ErrorMeta = {
  name?: string
  channel?: "error" | "warning"
  sampleRate?: number
}

const DEDUPE_WINDOW_MS = 5 * 60 * 1000
const MAX_CACHE = 500
const recent = new Map<string, number>()

const env = () => (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase()
const enabled = () => (process.env.DISCORD_NOTIFY_ENABLED ?? "").toLowerCase() === "true"

const shouldSend = (key: string, sampleRate: number) => {
  const now = Date.now()
  const last = recent.get(key)
  if (typeof last === "number" && now - last < DEDUPE_WINDOW_MS) {
    return false
  }
  const pass = sampleRate >= 1 ? true : Math.random() < sampleRate
  if (!pass) return false

  recent.set(key, now)
  if (recent.size > MAX_CACHE) {
    const cutoff = now - DEDUPE_WINDOW_MS
    for (const [k, ts] of recent.entries()) {
      if (ts < cutoff) recent.delete(k)
    }
  }
  return true
}

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  if (typeof error === "string") {
    return { message: error }
  }
  return { message: "Unknown error", detail: String(error) }
}

const severityFromStatus = (status?: number): DiscordSeverity => {
  if (!status) return "error"
  if (status >= 500) return "critical"
  if (status >= 400) return "error"
  return "warning"
}

const sendDiscord = (payload: Parameters<typeof notifyDiscord>[0], channel: "error" | "warning") =>
  notifyDiscord(payload, { channel })

export const withApiErrorReporting = (handler: Handler, meta: ErrorMeta = {}): Handler => {
  return async (request: Request) => {
    try {
      const response = await handler(request)

      if (
        enabled() &&
        env() === "production" &&
        response instanceof Response &&
        response.status >= 500
      ) {
        const url = new URL(request.url)
        let bodyText: string | undefined
        try {
          bodyText = await response.clone().text()
        } catch {
          // ignore body read failures
        }

        const dedupeKey = `${meta.name ?? url.pathname}:status:${response.status}:${bodyText ?? "nobody"}`

        if (shouldSend(dedupeKey, meta.sampleRate ?? 1)) {
          void sendDiscord(
            {
              type: "error",
              title: `API error response: ${meta.name ?? url.pathname}`,
              message: bodyText ?? `Server responded with status ${response.status}`,
              severity: severityFromStatus(response.status),
              status: `${response.status}`,
              context: {
                path: url.pathname,
                method: request.method,
                name: meta.name,
              },
            },
            meta.channel ?? "error",
          )
        }
      }

      return response
    } catch (error) {
      const url = new URL(request.url)
      const normalizedError = normalizeError(error)
      const status = (error as { status?: number })?.status
      const channel = meta.channel ?? "error"
      const sampleRate = meta.sampleRate ?? 1
      const dedupeKey = `${meta.name ?? url.pathname}:${normalizedError.message}:${status ?? "err"}`

      if (enabled() && env() === "production" && shouldSend(dedupeKey, sampleRate)) {
        void sendDiscord(
          {
            type: "error",
            title: `API error: ${meta.name ?? url.pathname}`,
            message: normalizedError.message,
            severity: severityFromStatus(status),
            status: status ? `${status}` : undefined,
            context: {
              path: url.pathname,
              method: request.method,
              name: meta.name,
              stack: normalizedError.stack,
            },
          },
          { channel },
        )
      }

      throw error
    }
  }
}
