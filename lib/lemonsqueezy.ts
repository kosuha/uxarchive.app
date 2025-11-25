import { createHmac, timingSafeEqual } from "crypto"

import { lemonSqueezyBilling } from "./billing-config"

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1"

const getEnv = (key: string, fallbackKey?: string) => {
  const value = process.env[key]?.trim()
  if (value) return value
  if (fallbackKey) {
    const fallback = process.env[fallbackKey]?.trim()
    if (fallback) return fallback
  }
  throw new Error(
    `Missing required environment variable: ${key}${fallbackKey ? ` (or ${fallbackKey})` : ""}`
  )
}

export type CreateCheckoutOptions = {
  email?: string
  redirectUrl?: string
  userId?: string
  metadata?: Record<string, unknown>
  variantId?: string
  planCode?: string
}

type CheckoutResponse = {
  data?: {
    attributes?: {
      url?: string
    }
  }
}

export type LemonSqueezyWebhookPayload = {
  meta?: {
    event_name?: string
    event_id?: string
    test_mode?: boolean
    custom_data?: {
      userId?: string
      planCode?: string
    }
  }
  data?: {
    id?: string
    type?: string
    attributes?: Record<string, unknown>
  }
}

export async function createLemonSqueezyCheckout(
  options: CreateCheckoutOptions = {}
): Promise<string> {
  const apiKey = lemonSqueezyBilling.apiKey ?? getEnv("LEMONSQUEEZY_API_KEY")
  const storeId = lemonSqueezyBilling.storeId ?? getEnv("LEMONSQUEEZY_STORE_ID")
  const variantId =
    options.variantId ??
    lemonSqueezyBilling.plans.plus.variantId ??
    getEnv("LEMONSQUEEZY_VARIANT_ID_PLUS")

  const checkoutData: Record<string, unknown> = {}
  const customData: Record<string, unknown> = options.metadata ? { ...options.metadata } : {}
  if (options.planCode) customData.planCode = options.planCode
  if (options.userId) customData.userId = options.userId
  if (Object.keys(customData).length > 0) checkoutData.custom = customData
  if (options.email) checkoutData.email = options.email

  const productOptions: Record<string, unknown> = {}
  const redirectUrl = options.redirectUrl ?? lemonSqueezyBilling.plans.plus.redirectUrl
  if (redirectUrl) {
    productOptions.redirect_url = redirectUrl
  }

  const attributes: Record<string, unknown> = {}
  if (Object.keys(checkoutData).length > 0) attributes.checkout_data = checkoutData
  if (Object.keys(productOptions).length > 0) attributes.product_options = productOptions

  const payload = {
    data: {
      type: "checkouts",
      attributes,
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: variantId } },
      },
    },
  }

  const response = await fetch(`${LEMONSQUEEZY_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create LemonSqueezy checkout: ${response.status} ${errorText}`
    )
  }

  const json = (await response.json()) as CheckoutResponse
  const url = json?.data?.attributes?.url
  if (!url) {
    throw new Error("LemonSqueezy checkout response did not include a URL.")
  }

  return url
}

export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null
) {
  const secret = lemonSqueezyBilling.webhookSecret ?? getEnv("LEMONSQUEEZY_WEBHOOK_SECRET")
  if (!signature) return false

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")

  const expectedBuffer = Buffer.from(expected, "hex")
  const providedBuffer = Buffer.from(signature, "hex")

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  try {
    return timingSafeEqual(expectedBuffer, providedBuffer)
  } catch {
    return false
  }
}

type PortalResponse = {
  data?: {
    id?: string
    attributes?: {
      url?: string
    }
  }
}

export async function createLemonSqueezyPortal(options: {
  customerId: string
  returnUrl?: string
}): Promise<PortalResponse> {
  const apiKey = lemonSqueezyBilling.apiKey ?? getEnv("LEMONSQUEEZY_API_KEY")

  const payload = {
    data: {
      type: "customer-portals",
      attributes: {
        customer_id: options.customerId,
        ...(options.returnUrl ? { return_url: options.returnUrl } : {}),
      },
    },
  }

  const response = await fetch(`${LEMONSQUEEZY_API_BASE}/customer-portal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create LemonSqueezy customer portal: ${response.status} ${errorText}`
    )
  }

  return (await response.json()) as PortalResponse
}

type SubscriptionResponse = {
  data?: {
    id?: string
    attributes?: Record<string, unknown>
  }
}

export async function getLemonSqueezySubscription(subscriptionId: string) {
  const apiKey = lemonSqueezyBilling.apiKey ?? getEnv("LEMONSQUEEZY_API_KEY")

  const response = await fetch(
    `${LEMONSQUEEZY_API_BASE}/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to fetch LemonSqueezy subscription: ${response.status} ${errorText}`
    )
  }

  return (await response.json()) as SubscriptionResponse
}

export type LemonSqueezyPlanStatus = "active" | "trialing" | "past_due" | "canceled"

export function mapLemonSqueezyStatus(status?: string): LemonSqueezyPlanStatus {
  const normalized = status?.toLowerCase() ?? ""
  switch (normalized) {
    case "on_trial":
    case "trialing":
      return "trialing"
    case "past_due":
    case "unpaid":
      return "past_due"
    case "cancelled":
    case "canceled":
    case "expired":
    case "paused":
      return "canceled"
    default:
      return "active"
  }
}

export function parseLemonSqueezyEvent(payload: LemonSqueezyWebhookPayload) {
  const attributes = (payload.data?.attributes ?? {}) as Record<string, unknown>
  const eventName = payload.meta?.event_name ?? "unknown"
  const rawStatus =
    (attributes as { status?: string }).status ??
    (attributes as { status_formatted?: string }).status_formatted
  const status = mapLemonSqueezyStatus(rawStatus)

  const passThroughRaw = (attributes as { pass_through?: string }).pass_through
  let userIdFromPassThrough: string | undefined
  let planCodeFromPassThrough: string | undefined
  if (typeof passThroughRaw === "string") {
    try {
      const parsed = JSON.parse(passThroughRaw) as { userId?: string; planCode?: string }
      if (parsed && typeof parsed.userId === "string") {
        userIdFromPassThrough = parsed.userId
      }
      if (parsed && typeof parsed.planCode === "string") {
        planCodeFromPassThrough = parsed.planCode
      }
    } catch {
      // pass_through이 JSON이 아닌 경우 그대로 무시
    }
  }

  const custom = attributes as { custom?: Record<string, unknown> }
  const userIdFromCustom =
    typeof custom.custom?.userId === "string" ? custom.custom.userId : undefined
  const planCodeFromCustom =
    typeof custom.custom?.planCode === "string" ? custom.custom.planCode : undefined

  const metaCustom = (payload.meta ?? {}) as {
    custom_data?: { userId?: string; planCode?: string }
  }
  const userIdFromMetaCustom =
    typeof metaCustom.custom_data?.userId === "string"
      ? metaCustom.custom_data.userId
      : undefined
  const planCodeFromMetaCustom =
    typeof metaCustom.custom_data?.planCode === "string"
      ? metaCustom.custom_data.planCode
      : undefined

  const eventId =
    (payload.meta as { event_id?: string })?.event_id ??
    (payload.meta as { eventId?: string })?.eventId ??
    (attributes as { event_id?: string }).event_id ??
    (attributes as { identifier?: string }).identifier ??
    payload.data?.id

  return {
    eventName,
    eventId,
    subscriptionId: payload.data?.id,
    customerId: (attributes as { customer_id?: string }).customer_id,
    orderId: (attributes as { order_id?: string }).order_id,
    status,
    rawStatus,
    userId: userIdFromCustom ?? userIdFromPassThrough ?? userIdFromMetaCustom,
    planCode: planCodeFromCustom ?? planCodeFromPassThrough ?? planCodeFromMetaCustom,
    testMode: Boolean(payload.meta?.test_mode),
    raw: payload,
  }
}
