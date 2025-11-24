/**
 * Server-only LemonSqueezy billing configuration.
 * Reads environment variables once so they can be reused across server modules.
 * Do not import this file in client components.
 */
const readEnv = (key: string) => process.env[key]?.trim() || undefined

export type BillingPlanConfig = {
  code: string
  productId?: string
  variantId?: string
  redirectUrl?: string
}

export type LemonSqueezyBillingConfig = {
  apiKey?: string
  storeId?: string
  webhookSecret?: string
  plans: {
    plus: BillingPlanConfig
  }
}

export const lemonSqueezyBilling: LemonSqueezyBillingConfig = {
  apiKey: readEnv("LEMONSQUEEZY_API_KEY"),
  storeId: readEnv("LEMONSQUEEZY_STORE_ID"),
  webhookSecret: readEnv("LEMONSQUEEZY_WEBHOOK_SECRET"),
  plans: {
    plus: {
      code: "plus",
      productId: readEnv("LEMONSQUEEZY_PRODUCT_ID_PLUS"),
      variantId: readEnv("LEMONSQUEEZY_VARIANT_ID_PLUS"),
    },
  },
}
