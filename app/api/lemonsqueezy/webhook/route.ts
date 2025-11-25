import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import { lemonSqueezyBilling } from "@/lib/billing-config"
import {
  type LemonSqueezyWebhookPayload,
  parseLemonSqueezyEvent,
  verifyLemonSqueezySignature,
} from "@/lib/lemonsqueezy"
import { notifyDiscord } from "@/lib/notifications/discord"
import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"
import {
  type ServiceSupabaseClient,
  getServiceRoleSupabaseClient,
} from "@/lib/supabase/service-client"

export const runtime = "nodejs"

const PROFILE_COLUMNS =
  "id, plan_code, renewal_at, cancel_at, ls_customer_id, ls_subscription_id"
const PATHS_TO_REVALIDATE = ["/workspace", "/price/plus"]

type ParsedEvent = ReturnType<typeof parseLemonSqueezyEvent>

type ProfileRow = {
  id: string
  plan_code: string | null
  renewal_at: string | null
  cancel_at: string | null
  ls_customer_id: string | null
  ls_subscription_id: string | null
}

const parseDate = (value: unknown) => {
  if (typeof value !== "string") return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

async function findProfile(client: ServiceSupabaseClient, parsed: ParsedEvent): Promise<ProfileRow | null> {
  const lookups: Array<{ column: string; value: string }> = []

  if (parsed.userId) lookups.push({ column: "id", value: parsed.userId })
  if (parsed.subscriptionId)
    lookups.push({ column: "ls_subscription_id", value: parsed.subscriptionId })
  if (parsed.customerId) lookups.push({ column: "ls_customer_id", value: parsed.customerId })

  for (const lookup of lookups) {
    const { data, error } = await client
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq(lookup.column, lookup.value)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (data) return data as ProfileRow
  }

  return null
}

async function resolvePlanCode(
  client: ServiceSupabaseClient,
  variantId?: string,
  planCodeHint?: string
) {
  if (variantId) {
    const { data, error } = await client
      .from("plan_variants")
      .select("plan_code")
      .eq("ls_variant_id", variantId)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    const variantRow = data as { plan_code?: string | null } | null
    if (variantRow?.plan_code) return variantRow.plan_code
    if (variantId === lemonSqueezyBilling.plans.plus.variantId) {
      return lemonSqueezyBilling.plans.plus.code
    }
  }

  if (planCodeHint) return planCodeHint
  return undefined
}

const revalidateCachedPaths = () => {
  for (const path of PATHS_TO_REVALIDATE) {
    try {
      revalidatePath(path)
    } catch (error) {
      console.warn(`Failed to revalidate cache for ${path}`, error)
    }
  }
}

const isProdEnvironment = () =>
  (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase() === "production"

const resolvePaymentSeverity = (status?: string) => {
  switch (status) {
    case "past_due":
      return "warning" as const
    case "canceled":
      return "error" as const
    default:
      return "success" as const
  }
}

const resolveAmountDetails = (attributes: Record<string, unknown>) => {
  const amount = typeof (attributes as { total?: number }).total === "number"
    ? (attributes as { total?: number }).total
    : undefined
  const currency =
    typeof (attributes as { currency?: string }).currency === "string"
      ? (attributes as { currency?: string }).currency
      : typeof (attributes as { store_currency?: string }).store_currency === "string"
        ? (attributes as { store_currency?: string }).store_currency
        : undefined
  const formattedTotal =
    typeof (attributes as { formatted_total?: string }).formatted_total === "string"
      ? (attributes as { formatted_total?: string }).formatted_total
      : undefined

  return { amount, currency, formattedTotal }
}

const handler = async (request: Request) => {
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

  if (!parsed.eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 })
  }

  if (!parsed.subscriptionId && !parsed.customerId && !parsed.userId) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const supabase = getServiceRoleSupabaseClient()
  const planEventsTable = supabase.from("plan_events") as unknown as {
    insert: (values: { event_id: string }) => Promise<{ error: { code?: string } | null }>
    delete: () => { eq: (column: string, value: string) => Promise<unknown> }
  }
  const profilesTable = supabase.from("profiles") as unknown as {
    update: (values: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown | null }> }
  }

  const { error: eventInsertError } = await planEventsTable.insert({ event_id: parsed.eventId })

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("Failed to record webhook event id", eventInsertError)
    return NextResponse.json({ error: "event_not_recorded" }, { status: 500 })
  }

  try {
    const profile = (await findProfile(supabase, parsed)) as ProfileRow | null

    if (!profile) {
      await supabase.from("plan_events").delete().eq("event_id", parsed.eventId)
      return NextResponse.json({ error: "profile_not_found" }, { status: 404 })
    }

    const attributes = (parsed.raw.data?.attributes ?? {}) as Record<string, unknown>
    const variantId =
      typeof (attributes as { variant_id?: string }).variant_id === "string"
        ? (attributes as { variant_id?: string }).variant_id
        : undefined

    const planCode =
      (await resolvePlanCode(supabase, variantId, parsed.planCode)) ??
      profile.plan_code ??
      "free"

    const renewsAt =
      parseDate((attributes as { renews_at?: string }).renews_at) ??
      parseDate((attributes as { billing_anchor?: string }).billing_anchor)
    const trialEndsAt = parseDate((attributes as { trial_ends_at?: string }).trial_ends_at)

    let renewalAt: string | null | undefined =
      renewsAt ?? (parsed.status === "trialing" ? trialEndsAt : undefined)

    let cancelAt: string | null | undefined =
      parseDate((attributes as { ends_at?: string }).ends_at) ??
      parseDate((attributes as { expires_at?: string }).expires_at) ??
      parseDate((attributes as { canceled_at?: string }).canceled_at) ??
      parseDate((attributes as { cancelled_at?: string }).cancelled_at)

    if (parsed.status === "canceled") {
      renewalAt = null
    } else if (renewalAt === undefined) {
      renewalAt = profile.renewal_at
    }

    if (
      parsed.eventName === "subscription_resumed" ||
      parsed.eventName === "subscription_unpaused"
    ) {
      cancelAt = null
    } else if (cancelAt === undefined) {
      cancelAt = profile.cancel_at
    }

    const updates: Record<string, unknown> = {
      plan_code: planCode,
      plan_status: parsed.status,
      renewal_at: renewalAt ?? null,
      cancel_at: cancelAt ?? null,
    }

    if (parsed.customerId) updates.ls_customer_id = parsed.customerId
    if (parsed.subscriptionId) updates.ls_subscription_id = parsed.subscriptionId

    const { error: updateError } = await profilesTable
      .update(updates)
      .eq("id", profile.id)

    if (updateError) {
      throw updateError
    }

    const { amount, currency, formattedTotal } = resolveAmountDetails(attributes)
    const paymentTitle = parsed.eventName
      ? `Payment event: ${parsed.eventName}`
      : "Payment event"

    if (isProdEnvironment()) {
      await notifyDiscord(
        {
          type: "payment",
          title: paymentTitle,
          message: formattedTotal
            ? `${formattedTotal} (${planCode})`
            : `Plan ${planCode} status: ${parsed.status ?? "unknown"}`,
          severity: resolvePaymentSeverity(parsed.status),
          status: parsed.rawStatus ?? parsed.status,
          userId: profile.id,
          transactionId: parsed.orderId ?? parsed.subscriptionId ?? parsed.eventId,
          amount,
          currency,
          context: {
            planCode,
            status: parsed.status,
            rawStatus: parsed.rawStatus,
            eventId: parsed.eventId,
            eventName: parsed.eventName,
            subscriptionId: parsed.subscriptionId,
            customerId: parsed.customerId,
            testMode: parsed.testMode ?? false,
          },
        },
        {
          channel: "payment",
          sample: () => !parsed.testMode,
        },
      )
    }

    revalidateCachedPaths()

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("LemonSqueezy webhook handling failed", error)
    await planEventsTable.delete().eq("event_id", parsed.eventId)
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 })
  }
}

export const POST = withApiErrorReporting(handler, { name: "lemonsqueezy-webhook" })
