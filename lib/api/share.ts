export type ShareListSort = "recent" | "oldest" | "popular"

export type ShareListQueryParams = {
  search?: string
  sort?: ShareListSort
  page?: number
  perPage?: number
  includeCaptures?: boolean
}

export type ShareListItem = {
  id: string
  title: string
  service?: string | null
  author?: string | null
  tags?: string[]
  summary?: string | null
  updatedAt: string
  publishedAt?: string | null
  isPublic: boolean
  published: boolean
  views?: number | null
  publicUrl?: string | null
  thumbnailUrl?: string | null
  captureUrls?: string[]
}

export type ShareListResponse = {
  items: ShareListItem[]
  page: number
  perPage: number
  total: number
  hasNextPage: boolean
}

export type ShareListFetchOptions = Omit<RequestInit, "method"> & {
  next?: { revalidate?: number; tags?: string[] }
}

const SHARE_LIST_ENDPOINT = "/api/public/share"
const DEFAULT_PAGE_SIZE = 24

const resolveShareListUrl = (pathOrUrl: string) => {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl

  // On the server, Node fetch requires an absolute URL. Prefer NEXT_PUBLIC_SITE_URL, otherwise fall back
  // to Vercel-provided host or localhost.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  return new URL(pathOrUrl, origin).toString()
}

export class ShareListingApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ShareListingApiError"
    this.status = status
  }
}

const buildQueryString = (params: ShareListQueryParams): string => {
  const searchParams = new URLSearchParams()

  if (params.search?.trim()) searchParams.set("search", params.search.trim())
  if (params.sort) searchParams.set("sort", params.sort)
  if (params.page && params.page > 1) searchParams.set("page", String(params.page))
  if (params.perPage && params.perPage > 0) searchParams.set("perPage", String(params.perPage))
  if (params.includeCaptures) searchParams.set("includeCaptures", "true")

  return searchParams.toString()
}

type RawShareListItem = {
  id?: unknown
  title?: unknown
  service?: unknown
  author?: unknown
  tags?: unknown
  summary?: unknown
  updatedAt?: unknown
  updated_at?: unknown
  publishedAt?: unknown
  published_at?: unknown
  isPublic?: unknown
  is_public?: unknown
  sharing_enabled?: unknown
  published?: unknown
  publicUrl?: unknown
  public_url?: unknown
  views?: unknown
  thumbnailUrl?: unknown
  thumbnail_url?: unknown
  captureUrls?: unknown
  captures?: unknown
}

type RawShareListResponse = {
  items?: unknown
  data?: unknown
  page?: unknown
  pageSize?: unknown
  perPage?: unknown
  total?: unknown
  totalCount?: unknown
  hasNext?: unknown
  hasNextPage?: unknown
}

const normalizeShareItem = (raw: RawShareListItem): ShareListItem => {
  const id = typeof raw.id === "string" ? raw.id : ""
  const title = typeof raw.title === "string" ? raw.title : ""
  if (!id || !title) {
    throw new ShareListingApiError("Share item is missing id or title")
  }

  const tags =
    Array.isArray(raw.tags) && raw.tags.every((tag) => typeof tag === "string")
      ? (raw.tags as string[])
      : []

  const boolOr = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback)

  const stringOrNull = (value: unknown) =>
    typeof value === "string" ? value : value === null ? null : undefined

  const numberOrNull = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const normalizeDate = (value: unknown) => {
    if (typeof value !== "string") return undefined
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }

  const rawCaptures = raw.captureUrls ?? raw.captures

  return {
    id,
    title,
    service: stringOrNull(raw.service) ?? null,
    author: stringOrNull(raw.author) ?? null,
    tags,
    summary: stringOrNull(raw.summary) ?? null,
    updatedAt: normalizeDate(raw.updatedAt ?? raw.updated_at) ?? new Date().toISOString(),
    publishedAt: normalizeDate(raw.publishedAt ?? raw.published_at),
    isPublic: boolOr(raw.isPublic ?? raw.is_public ?? raw.sharing_enabled, false),
    published: boolOr(raw.published, false),
    views: numberOrNull(raw.views),
    publicUrl: stringOrNull(raw.publicUrl ?? raw.public_url),
    thumbnailUrl: stringOrNull(raw.thumbnailUrl ?? raw.thumbnail_url),
    captureUrls:
      Array.isArray(rawCaptures)
        ? (rawCaptures as unknown[]).filter((value): value is string => typeof value === "string")
        : undefined,
  }
}

const normalizeShareListResponse = (raw: unknown): ShareListResponse => {
  const payload = (raw ?? {}) as RawShareListResponse
  const rawItems = Array.isArray(payload.items)
    ? (payload.items as RawShareListItem[])
    : Array.isArray(payload.data)
      ? (payload.data as RawShareListItem[])
      : []

  const page =
    typeof payload.page === "number" && Number.isFinite(payload.page) && payload.page > 0
      ? payload.page
      : 1

  const perPageCandidate =
    typeof payload.perPage === "number"
      ? payload.perPage
      : typeof payload.pageSize === "number"
        ? payload.pageSize
        : null
  const perPage =
    perPageCandidate && Number.isFinite(perPageCandidate) && perPageCandidate > 0
      ? perPageCandidate
      : DEFAULT_PAGE_SIZE

  const totalCandidate =
    typeof payload.total === "number"
      ? payload.total
      : typeof payload.totalCount === "number"
        ? payload.totalCount
        : null
  const total = totalCandidate && Number.isFinite(totalCandidate) && totalCandidate >= 0 ? totalCandidate : 0

  const hasNext =
    typeof payload.hasNext === "boolean"
      ? payload.hasNext
      : typeof payload.hasNextPage === "boolean"
        ? payload.hasNextPage
        : page * perPage < total

  const items = rawItems.map(normalizeShareItem).filter((item) => item.isPublic && item.published)

  return {
    items,
    page,
    perPage,
    total,
    hasNextPage: hasNext,
  }
}

export const fetchShareList = async (
  params: ShareListQueryParams = {},
  options: ShareListFetchOptions = {},
): Promise<ShareListResponse> => {
  const query = buildQueryString(params)
  const url = resolveShareListUrl(query ? `${SHARE_LIST_ENDPOINT}?${query}` : SHARE_LIST_ENDPOINT)

  const response = await fetch(url, {
    ...options,
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("API Error details:", errorText)
    throw new ShareListingApiError(
      `Failed to load published posts (${response.status}): ${errorText.slice(0, 100)}`,
      response.status,
    )
  }

  const json = await response.json()
  return normalizeShareListResponse(json)
}
