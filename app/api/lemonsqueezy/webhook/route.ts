import { NextResponse } from "next/server"

import {
  type LemonSqueezyWebhookPayload,
  parseLemonSqueezyEvent,
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

  const parsed = parseLemonSqueezyEvent(payload)

  const logPayload = {
    eventName: parsed.eventName,
    eventId: parsed.eventId,
    subscriptionId: parsed.subscriptionId,
    customerId: parsed.customerId,
    userId: parsed.userId,
    status: parsed.status,
    renews_at: (parsed.raw.data?.attributes as Record<string, unknown> | undefined)
      ?.renews_at,
    ends_at: (parsed.raw.data?.attributes as Record<string, unknown> | undefined)
      ?.ends_at,
    testMode: parsed.testMode,
  }

  switch (parsed.eventName) {
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
      console.info(`LemonSqueezy event handled: ${parsed.eventName}`, logPayload)
      break
    default:
      console.warn(
        `LemonSqueezy event ignored (unrecognized): ${parsed.eventName}`,
        logPayload
      )
  }

  return NextResponse.json({ received: true })
}
