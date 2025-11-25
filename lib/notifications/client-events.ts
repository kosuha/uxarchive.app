"use client"

import type { DiscordEventInput, DiscordSeverity } from "./discord"
import { notifyDiscord } from "./discord"

type ClientEventType = "error" | "warning"

type ClientEventContext = {
  userId?: string
  workspaceId?: string | null
}

type ClientEvent = {
  type: ClientEventType
  title: string
  message: string
  severity?: DiscordSeverity
  context?: Record<string, unknown>
  dedupeKey?: string
  sampleRate?: number
}

const DEFAULT_SAMPLE_RATE: Record<ClientEventType, number> = {
  error: 1,
  warning: 0.25,
}

const DEDUPE_WINDOW_MS = 5 * 60 * 1000
const MAX_CACHE = 100

let listenersInstalled = false
let context: ClientEventContext = {}
const recentEvents = new Map<string, number>()

const normalizeEnv = () => (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase()

const cleanCache = (now: number) => {
  if (recentEvents.size <= MAX_CACHE) return
  const cutoff = now - DEDUPE_WINDOW_MS
  for (const [key, timestamp] of recentEvents.entries()) {
    if (timestamp < cutoff) {
      recentEvents.delete(key)
    }
  }
}

const shouldSend = (event: ClientEvent) => {
  const now = Date.now()
  const scopeHint = context.workspaceId ? `:${context.workspaceId}` : context.userId ? `:${context.userId}` : ""
  const dedupeKey =
    event.dedupeKey ?? `${event.type}:${event.title}:${event.message.slice(0, 120)}${scopeHint}`
  const lastSentAt = recentEvents.get(dedupeKey)

  if (typeof lastSentAt === "number" && now - lastSentAt < DEDUPE_WINDOW_MS) {
    return false
  }

  const sampleRate = event.sampleRate ?? DEFAULT_SAMPLE_RATE[event.type] ?? 1
  const passesSample = sampleRate >= 1 ? true : Math.random() < sampleRate
  if (!passesSample) return false

  recentEvents.set(dedupeKey, now)
  cleanCache(now)
  return true
}

const toDiscordEvent = (event: ClientEvent): DiscordEventInput => ({
  type: event.type,
  title: event.title,
  message: event.message,
  severity: event.severity ?? (event.type === "warning" ? "warning" : "error"),
  workspaceId: context.workspaceId ?? undefined,
  userId: context.userId,
  context: event.context,
})

const recordEvent = async (event: ClientEvent) => {
  if (normalizeEnv() !== "production") return false

  return notifyDiscord(toDiscordEvent(event), {
    channel: event.type === "warning" ? "warning" : "error",
    sample: () => shouldSend(event),
  })
}

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  if (typeof error === "string") return { message: error }
  return { message: "Unknown error", detail: String(error) }
}

const serializeArgs = (args: unknown[]) =>
  args.slice(0, 3).map((value) => {
    if (value instanceof Error) {
      return { message: value.message, stack: value.stack }
    }
    if (typeof value === "string") return value
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return String(value)
    }
  })

export const setClientEventContext = (partial: ClientEventContext) => {
  context = { ...context, ...partial }
}

export const installClientEventLogger = () => {
  if (listenersInstalled) return
  if (typeof window === "undefined") return
  listenersInstalled = true

  window.addEventListener("error", (event) => {
    const message = event.message || event.error?.message || "Client error"
    const stack = event.error instanceof Error ? event.error.stack : undefined
    void recordEvent({
      type: "error",
      title: "Client error",
      message,
      severity: "error",
      context: {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack,
      },
      dedupeKey: stack ? `error:${stack}` : undefined,
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    const info = formatError(event.reason)
    void recordEvent({
      type: "error",
      title: "Unhandled promise rejection",
      message: info.message ?? "Unhandled rejection",
      severity: "error",
      context: {
        ...info,
      },
      dedupeKey: info.stack ? `rejection:${info.stack}` : undefined,
    })
  })

  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args as Parameters<typeof console.warn>)
    const message = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(" ")
    void recordEvent({
      type: "warning",
      title: "Client warning",
      message: message.slice(0, 500),
      severity: "warning",
      context: { args: serializeArgs(args) },
    })
  }
}

export const reportClientEvent = (event: ClientEvent) => recordEvent(event)
