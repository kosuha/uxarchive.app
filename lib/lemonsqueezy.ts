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
  custom?: Record<string, unknown>
  variantId?: string
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
    test_mode?: boolean
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
  if (options.email) checkoutData.email = options.email
  if (options.custom) checkoutData.custom = options.custom

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
      "Content-Type": "application/json",
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
