import { NextResponse } from "next/server"

import type { ShareListItem, ShareListResponse, ShareListSort } from "@/lib/api/share"
import { withApiErrorReporting } from "@/lib/notifications/api-error-wrapper"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_PER_PAGE = 24
const MAX_PER_PAGE = 100
const MIN_PER_PAGE = 1
const SHARE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "ux-archive-captures"
const SIGNED_URL_TTL_SECONDS = 60 * 60

const SORT_COLUMNS: Record<ShareListSort, { column: string; ascending: boolean }> = {
  recent: { column: "updated_at", ascending: false },
  oldest: { column: "updated_at", ascending: true },
  popular: { column: "views", ascending: false },
}

const parseNumberParam = (value: string | null, fallback: number, min = 1, max?: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const clamped = Math.max(parsed, min)
  if (typeof max === "number") {
    return Math.min(Math.floor(clamped), max)
  }
  return Math.floor(clamped)
}

const sanitizeSearch = (raw: string | null) => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 200)
}

const buildSearchClause = (term: string) => {
  const escaped = term.replace(/[%]/g, "").replace(/,/g, " ").trim()
  const pattern = `%${escaped || term}%`
  return [
    `title.ilike.${pattern}`,
    `service.ilike.${pattern}`,
    `author.ilike.${pattern}`,
  ].join(",")
}

const mapRowToShareItem = (row: Record<string, unknown>): ShareListItem => {
  const stringOrNull = (value: unknown) =>
    typeof value === "string" ? value : value === null ? null : undefined

  const numberOrNull = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const tags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === "string")
    : []

  const isPublicRaw =
    (row as { is_public?: unknown }).is_public ?? (row as { sharing_enabled?: unknown }).sharing_enabled

  return {
    id: String(row.id ?? ""),
    title: stringOrNull(row.title) ?? "",
    service: stringOrNull(row.service) ?? null,
    author: stringOrNull(row.author) ?? null,
    authorId: stringOrNull((row as { author_id?: unknown }).author_id) ?? null,
    tags,
    summary: stringOrNull(row.summary) ?? null,
    updatedAt: stringOrNull((row as { updated_at?: unknown }).updated_at) ?? new Date().toISOString(),
    isPublic: typeof isPublicRaw === "boolean" ? isPublicRaw : Boolean(isPublicRaw),
    views: numberOrNull(row.views),
    publicUrl: stringOrNull((row as { public_url?: unknown }).public_url),
    thumbnailUrl: stringOrNull((row as { thumbnail_url?: unknown }).thumbnail_url),
  }
}

type CaptureThumbnailRow = {
  pattern_id: string
  id?: string
  storage_path: string | null
  public_url: string | null
  poster_storage_path: string | null
  order_index?: number | null
}

const sanitizePath = (value: string | null | undefined) => value?.replace(/^\/+/, "").trim() || ""

const isAbsoluteUrl = (value: string | null | undefined) => {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return Boolean(parsed.protocol && parsed.host)
  } catch {
    return false
  }
}

const buildPublicStorageUrl = (objectPath: string) => {
  const sanitized = sanitizePath(objectPath)
  if (!sanitized) return null

  const customEndpoint = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ENDPOINT?.trim()?.replace(/\/$/, "")
  if (customEndpoint) {
    return `${customEndpoint}/${SHARE_BUCKET}/${sanitized}`
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!supabaseUrl) return null

  try {
    const parsed = new URL(supabaseUrl)
    return `${parsed.protocol}//${parsed.hostname}/storage/v1/object/public/${SHARE_BUCKET}/${sanitized}`
  } catch {
    return null
  }
}

const resolveCaptureThumbnailUrl = async (
  client: ReturnType<typeof getServiceRoleSupabaseClient>,
  capture: CaptureThumbnailRow,
) => {
  const posterPath = sanitizePath(capture.poster_storage_path)
  const storagePath = sanitizePath(capture.storage_path)

  // Prefer storage paths for signing to avoid unauthenticated public requests
  const signFirst = posterPath || storagePath
  if (signFirst) {
    const signed = await signThumbnailPath(client, signFirst, SHARE_BUCKET)
    if (signed) return signed
  }

  const publicCandidate = capture.public_url?.trim()
  if (publicCandidate) {
    if (isAbsoluteUrl(publicCandidate)) {
      const parsed = parseSupabaseObjectPath(publicCandidate)
      if (parsed) {
        const signed = await signThumbnailPath(client, parsed.objectPath, parsed.bucket)
        if (signed) return signed
        // Supabase URL but signing failed: avoid hitting public endpoints on private buckets
        return null
      }
      return publicCandidate
    }
    const built = buildPublicStorageUrl(publicCandidate)
    if (built) return built
  }

  const signTarget = posterPath || storagePath
  if (!signTarget) return null

  const { data, error } = await client.storage
    .from(SHARE_BUCKET)
    .createSignedUrl(signTarget, SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.error("[public/share] failed to sign capture thumbnail", { error, patternId: capture.pattern_id })
  }

  if (data?.signedUrl) return data.signedUrl

  return buildPublicStorageUrl(signTarget)
}

const signThumbnailPath = async (
  client: ReturnType<typeof getServiceRoleSupabaseClient>,
  objectPath: string | null | undefined,
  bucket = SHARE_BUCKET,
) => {
  const signTarget = sanitizePath(objectPath)
  if (!signTarget) return null

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(signTarget, SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.error("[public/share] failed to sign thumbnail", { error, signTarget, bucket })
    return null
  }

  if (data?.signedUrl) return data.signedUrl
  return null
}

const parseSupabaseObjectPath = (urlString: string): { bucket: string; objectPath: string } | null => {
  try {
    const url = new URL(urlString)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const storageHost = supabaseUrl ? new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/, ".storage.supabase.co") : null
    const customEndpoint = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ENDPOINT?.trim()
    const customEndpointHost = customEndpoint ? new URL(customEndpoint).hostname : null
    const customEndpointPath = customEndpoint ? new URL(customEndpoint).pathname.replace(/\/$/, "") : ""
    const isStorageHost = storageHost ? url.hostname === storageHost : false
    const isProjectHost = supabaseUrl ? url.hostname === new URL(supabaseUrl).hostname : false
    const isCustomHost = customEndpointHost ? url.hostname === customEndpointHost : false
    if (!isStorageHost && !isProjectHost && !isCustomHost) return null

    const match =
      url.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/) ||
      url.pathname.match(/^\/storage\/v1\/s3\/([^/]+)\/(.+)$/) ||
      (isCustomHost
        ? url.pathname.replace(customEndpointPath, "").match(/^\/?([^/]+)\/(.+)$/)
        : null)
    if (!match) return null

    const [, bucket, objectPath] = match
    return { bucket, objectPath }
  } catch {
    return null
  }
}

const hydrateThumbnails = async (
  client: ReturnType<typeof getServiceRoleSupabaseClient>,
  items: ShareListItem[],
  includeCaptures?: boolean,
): Promise<ShareListItem[]> => {
  const itemsNeedingSigning = items.filter((item) => {
    const url = item.thumbnailUrl
    if (!url) return false
    if (!isAbsoluteUrl(url)) return true
    if (url.includes("/object/sign/")) return false
    const parsed = parseSupabaseObjectPath(url)
    return Boolean(parsed)
  })
  const missingThumbnailIds = items.filter((item) => !item.thumbnailUrl?.trim()).map((item) => item.id)

  const signedExistingEntries = await Promise.all(
    itemsNeedingSigning.map(async (item) => {
      const parsed = item.thumbnailUrl ? parseSupabaseObjectPath(item.thumbnailUrl) : null
      const signPath = parsed?.objectPath ?? item.thumbnailUrl
      const bucket = parsed?.bucket ?? SHARE_BUCKET
      const signed = await signThumbnailPath(client, signPath, bucket)
      // store even if null to avoid falling back to invalid public path
      return [item.id, { signed, hadParsed: Boolean(parsed) }] as const
    }),
  )
  const signingLookup = signedExistingEntries.reduce<Record<string, { signed: string | null; hadParsed: boolean }>>(
    (acc, [id, data]) => {
      acc[id] = data
      return acc
    },
    {},
  )

  const signedExistingLookup = Object.entries(signingLookup).reduce<Record<string, string | null>>((acc, [id, data]) => {
    acc[id] = data.signed ?? null
    return acc
  }, {})

  if (missingThumbnailIds.length === 0 && !includeCaptures) return items

  const patternIds = Array.from(new Set(items.map((item) => item.id))).filter(Boolean)

  const captureQueryNeeded = includeCaptures || missingThumbnailIds.length > 0
  const { data: captures, error: capturesError } = captureQueryNeeded
    ? await client
        .from("captures")
        .select("id, pattern_id, storage_path, public_url, poster_storage_path, order_index")
        .in("pattern_id", patternIds)
        .order("pattern_id", { ascending: true })
        .order("order_index", { ascending: true })
    : { data: null, error: null }

  if (capturesError) {
    console.error("[public/share] Failed to load capture thumbnails", capturesError)
    if (!includeCaptures && missingThumbnailIds.length === 0) return items
  }

  const captureRows = (captures ?? []) as CaptureThumbnailRow[]

  const firstCaptureByPattern = new Map<string, CaptureThumbnailRow>()
  for (const row of captureRows) {
    if (!row?.pattern_id || firstCaptureByPattern.has(row.pattern_id)) continue
    firstCaptureByPattern.set(row.pattern_id, row)
  }

  const resolvedEntries = await Promise.all(
    Array.from(firstCaptureByPattern.entries()).map(async ([patternId, capture]) => {
      const url = await resolveCaptureThumbnailUrl(client, capture)
      return [patternId, url] as const
    }),
  )

  const thumbnailLookup = resolvedEntries.reduce<Record<string, string | null>>((acc, [patternId, url]) => {
    if (url) acc[patternId] = url
    return acc
  }, {})

  const captureGroups = captureRows.reduce<Record<string, CaptureThumbnailRow[]>>((acc, row) => {
    if (!row?.pattern_id) return acc
    if (!acc[row.pattern_id]) acc[row.pattern_id] = []
    acc[row.pattern_id].push(row)
    return acc
  }, {})

  const captureUrlEntries = includeCaptures
    ? await Promise.all(
        Object.entries(captureGroups).map(async ([patternId, caps]) => {
          const urls = await Promise.all(
            caps.map(async (capture) => ({
              id: capture.id ?? capture.pattern_id,
              url: await resolveCaptureThumbnailUrl(client, capture),
            })),
          )
          return [patternId, urls.map((item) => item.url).filter((url): url is string => Boolean(url))] as const
        }),
      )
    : []

  const captureUrlLookup = captureUrlEntries.reduce<Record<string, string[]>>((acc, [patternId, urls]) => {
    acc[patternId] = urls
    return acc
  }, {})

  return items.map((item) => ({
    ...item,
    thumbnailUrl:
      signingLookup[item.id]?.hadParsed
        ? signedExistingLookup[item.id] ?? thumbnailLookup[item.id] ?? null
        : signedExistingLookup[item.id] || item.thumbnailUrl?.trim() || thumbnailLookup[item.id] || null,
    captureUrls: includeCaptures ? captureUrlLookup[item.id] ?? [] : item.captureUrls,
  }))
}

const handler = async (request: Request) => {
  try {
    const url = new URL(request.url)
    const search = sanitizeSearch(url.searchParams.get("search"))
    const sortParam = (url.searchParams.get("sort") as ShareListSort | null) ?? "recent"
    const sort = SORT_COLUMNS[sortParam]

    if (!sort) {
      return NextResponse.json(
        { error: "Invalid sort option. Use recent, oldest, or popular." },
        { status: 400 },
      )
    }

    const page = parseNumberParam(url.searchParams.get("page"), 1, 1)
    const perPage = parseNumberParam(
      url.searchParams.get("perPage") ?? url.searchParams.get("pageSize"),
      DEFAULT_PER_PAGE,
      MIN_PER_PAGE,
      MAX_PER_PAGE,
    )

    const userId = sanitizeSearch(url.searchParams.get("userId"))

    const supabase = getServiceRoleSupabaseClient()
    let query = supabase
      .from("pattern_public_listing")
      .select(
        "id,title,service,author,author_id,summary,tags,updated_at,is_public:sharing_enabled,views,like_count,fork_count,public_url,thumbnail_url",
        { count: "exact" },
      )
      .eq("sharing_enabled", true)

    if (search) {
      query = query.or(buildSearchClause(search))
    }

    if (userId) {
      query = query.eq("author_id", userId)
    }

    query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false })

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error("[public/share] Failed to load listings", error)
      return NextResponse.json({ error: "Failed to load public posts." }, { status: 500 })
    }

    const items = (data ?? [])
      .map(mapRowToShareItem)
      .filter((item) => item.id && item.title && item.isPublic)
    const total = typeof count === "number" && count >= 0 ? count : items.length
    const hasNextPage = total > page * perPage
    const includeCaptures = url.searchParams.get("includeCaptures") === "true"
    const itemsWithThumbnails = await hydrateThumbnails(supabase, items, includeCaptures)

    const response: ShareListResponse = {
      items: itemsWithThumbnails,
      page,
      perPage,
      total,
      hasNextPage,
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=120" },
    })
  } catch (error) {
    console.error("[public/share] Unexpected error", error)
    return NextResponse.json({ error: "Failed to load published posts." }, { status: 500 })
  }
}

export const GET = withApiErrorReporting(handler, { name: "public-share", sampleRate: 0.5 })
