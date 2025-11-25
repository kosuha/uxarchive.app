export type DiscordChannel = "error" | "warning" | "payment"

export type DiscordSeverity = "critical" | "error" | "warning" | "info" | "success"

export type DiscordEventInput = {
  type: string
  title: string
  message?: string
  severity?: DiscordSeverity
  timestamp?: Date | string
  workspaceId?: string
  userId?: string
  context?: Record<string, unknown> | string
  transactionId?: string
  amount?: number
  currency?: string
  status?: string
}

export type DiscordPayload = {
  content?: string
  embeds: Array<{
    title?: string
    description?: string
    color?: number
    timestamp?: string
    fields?: Array<{ name: string; value: string; inline?: boolean }>
  }>
}

const colorBySeverity: Record<DiscordSeverity, number> = {
  critical: 0xed4245,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x5865f2,
  success: 0x57f287,
}

const colorByType: Record<string, number> = {
  error: colorBySeverity.error,
  warning: colorBySeverity.warning,
  payment: colorBySeverity.success,
}

const parseIntWithFallback = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const DEFAULT_TIMEOUT_MS = parseIntWithFallback(process.env.DISCORD_TIMEOUT_MS, 5000)
const DEFAULT_RETRY_COUNT = parseIntWithFallback(process.env.DISCORD_RETRY_COUNT, 2)
const MAX_FIELD_LENGTH = 1024

const truncate = (value: string, max = MAX_FIELD_LENGTH) =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value

const safeStringify = (value: Record<string, unknown> | string) => {
  if (typeof value === "string") return truncate(value)
  try {
    const json = JSON.stringify(value, null, 2)
    return truncate(json)
  } catch {
    return "Invalid context"
  }
}

const resolveColor = (event: DiscordEventInput) => {
  const severity = event.severity ?? (["error", "warning"].includes(event.type) ? event.type : null)
  if (severity && colorBySeverity[severity as DiscordSeverity]) {
    return colorBySeverity[severity as DiscordSeverity]
  }
  const typeColor = colorByType[event.type]
  return typeColor ?? colorBySeverity.info
}

export function buildDiscordPayload(event: DiscordEventInput): DiscordPayload {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = []

  fields.push({
    name: "Type",
    value: truncate(event.type),
    inline: true,
  })

  if (event.severity) {
    fields.push({
      name: "Severity",
      value: truncate(event.severity),
      inline: true,
    })
  }

  if (event.status) {
    fields.push({
      name: "Status",
      value: truncate(event.status),
      inline: true,
    })
  }

  if (event.workspaceId) {
    fields.push({
      name: "Workspace",
      value: truncate(event.workspaceId),
      inline: true,
    })
  }

  if (event.userId) {
    fields.push({
      name: "User",
      value: truncate(event.userId),
      inline: true,
    })
  }

  if (event.transactionId) {
    fields.push({
      name: "Transaction",
      value: truncate(event.transactionId),
      inline: true,
    })
  }

  if (typeof event.amount === "number") {
    const amountLabel = event.currency ? `${event.amount} ${event.currency}` : `${event.amount}`
    fields.push({
      name: "Amount",
      value: truncate(amountLabel),
      inline: true,
    })
  }

  if (event.context) {
    fields.push({
      name: "Context",
      value: safeStringify(event.context),
    })
  }

  const embed = {
    title: event.title,
    description: event.message ? truncate(event.message, 2000) : undefined,
    color: resolveColor(event),
    timestamp: new Date(event.timestamp ?? Date.now()).toISOString(),
    fields: fields.length > 0 ? fields : undefined,
  }

  return { embeds: [embed] }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const shouldRetry = (status: number) => status === 429 || status >= 500

export async function postDiscord(
  webhookUrl: string,
  payload: DiscordPayload,
  options: { timeoutMs?: number; retries?: number } = {}
): Promise<void> {
  const retries = options.retries ?? DEFAULT_RETRY_COUNT
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  let attempt = 0
  let lastError: unknown

  while (attempt <= retries) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) return

      const body = await response.text()
      const error = new Error(`Discord webhook failed (${response.status}): ${body}`)
      if (!shouldRetry(response.status) || attempt === retries) throw error
      lastError = error
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      const abortError = error instanceof DOMException && error.name === "AbortError"
      if (abortError && attempt === retries) throw error
    }

    attempt += 1
    if (attempt > retries) break
    await wait(Math.min(2000, 500 * attempt))
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Discord webhook failed after retries")
}

type NotifyOptions = {
  channel?: DiscordChannel
  webhookOverride?: string
  sample?: (event: DiscordEventInput) => boolean
  timeoutMs?: number
  retries?: number
  allowInDev?: boolean
}

const isEnabled = () => (process.env.DISCORD_NOTIFY_ENABLED ?? "").toLowerCase() === "true"

const resolveWebhook = (event: DiscordEventInput, channel?: DiscordChannel) => {
  const normalizedChannel = channel ?? (event.type as DiscordChannel)
  if (normalizedChannel === "payment") {
    return process.env.DISCORD_WEBHOOK_URL_PAYMENT?.trim()
  }
  if (normalizedChannel === "warning") {
    return process.env.DISCORD_WEBHOOK_URL_WARNING?.trim() ?? process.env.DISCORD_WEBHOOK_URL_ERROR?.trim()
  }
  return process.env.DISCORD_WEBHOOK_URL_ERROR?.trim()
}

export async function notifyDiscord(
  event: DiscordEventInput,
  options: NotifyOptions = {}
): Promise<boolean> {
  if (!isEnabled()) return false
  const env = process.env.NODE_ENV ?? "development"
  if (env !== "production" && !options.allowInDev) return false
  if (options.sample && !options.sample(event)) return false

  const webhookUrl = options.webhookOverride ?? resolveWebhook(event, options.channel)
  if (!webhookUrl) return false

  const payload = buildDiscordPayload(event)

  try {
    await postDiscord(webhookUrl, payload, {
      timeoutMs: options.timeoutMs,
      retries: options.retries,
    })
    return true
  } catch (error) {
    console.error("Failed to send Discord notification", error)
    return false
  }
}
