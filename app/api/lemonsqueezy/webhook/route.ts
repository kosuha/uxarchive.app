import { NextResponse } from "next/server"

import {
  type LemonSqueezyWebhookPayload,
  verifyLemonSqueezySignature,
} from "@/lib/lemonsqueezy"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature")
  const rawBody = await request.text()

  let verified = false
  try {
    verified = verifyLemonSqueezySignature(rawBody, signature)
  } catch (error) {
    console.error("LemonSqueezy webhook verification failed", error)
    return NextResponse.json({ error: "webhook_misconfigured" }, { status: 500 })
  }

  if (!verified) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 })
  }

  let payload: LemonSqueezyWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
  }

  const eventName = payload.meta?.event_name ?? "unknown"
  const subscriptionId = payload.data?.id
  const attributes = (payload.data?.attributes ?? {}) as Record<string, unknown>
  const status =
    (attributes as { status?: string }).status ??
    (attributes as { status_formatted?: string }).status_formatted

  const logPayload = {
    eventName,
    subscriptionId,
    status,
    renews_at: (attributes as Record<string, unknown>).renews_at,
    ends_at: (attributes as Record<string, unknown>).ends_at,
    testMode: payload.meta?.test_mode,
  }

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_plan_changed":
    case "subscription_cancelled":
    case "subscription_resumed":
    case "subscription_paused":
    case "subscription_unpaused":
    case "subscription_expired":
    case "subscription_payment_success":
    case "subscription_payment_failed":
    case "subscription_payment_recovered":
    case "subscription_payment_refunded":
    case "order_created":
    case "order_refunded":
    case "affiliate_activated":
    case "license_key_created":
    case "license_key_updated":
      // TODO: DB 반영 로직 추가 예정
      console.info(`LemonSqueezy event handled: ${eventName}`, logPayload)
      break
    default:
      console.warn(`LemonSqueezy event ignored (unrecognized): ${eventName}`, logPayload)
  }

  return NextResponse.json({ received: true })
}
