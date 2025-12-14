import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicPatternViewer } from "@/components/public-view/public-pattern-viewer"
import type { Capture, Insight, Tag } from "@/lib/types"
import { createCapturesRepository } from "@/lib/repositories/captures"
import type { CaptureRecord } from "@/lib/repositories/captures"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import { getServerSupabaseClient } from "@/lib/supabase/server-client"
import type { ServiceSupabaseClient } from "@/lib/supabase/service-client"
import { loadPlanWithLimits } from "@/lib/plan-limits"

const SHARE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "ux-archive-captures"
const SIGNED_URL_EXPIRATION_SECONDS = 60 * 60

const parseSupabaseObjectPath = (urlString: string): { bucket: string; objectPath: string } | null => {
  try {
    const url = new URL(urlString)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const storageHost = supabaseUrl ? new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/, ".storage.supabase.co") : null
    const isStorageHost = storageHost ? url.hostname === storageHost : false
    const isProjectHost = supabaseUrl ? url.hostname === new URL(supabaseUrl).hostname : false
    if (!isStorageHost && !isProjectHost) return null

    const match =
      url.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/) ||
      url.pathname.match(/^\/storage\/v1\/s3\/([^/]+)\/(.+)$/)
    if (!match) return null

    const [, bucket, objectPath] = match
    return { bucket, objectPath }
  } catch {
    return null
  }
}

const fetchSharedPattern = cache(async (patternId: string) => {
  if (!patternId) {
    notFound()
  }

  const supabase = getServiceRoleSupabaseClient()
  const pattern = await loadPatternRecord(supabase, patternId)
  if (!pattern || !pattern.is_public) {
    notFound()
  }

  const [tags, captures] = await Promise.all([
    loadPatternTags(supabase, patternId),
    loadPatternCaptures(supabase, patternId),
  ])

  const captureIds = captures.map((capture) => capture.id)
  const insights = captureIds.length ? await loadPatternInsights(supabase, captureIds) : []

  return {
    pattern: {
      id: pattern.id,
      name: pattern.name,
      serviceName: pattern.service_name,
      summary: pattern.summary,
      author: pattern.author,
      updatedAt: pattern.updated_at,
      tags,
    },
    captures,
    insights,
  }
})

const loadPatternRecord = async (client: ServiceSupabaseClient, patternId: string) => {
  const { data, error } = await client
    .from("pattern_with_counts")
    .select("id, name, service_name, summary, author, updated_at, is_public")
    .eq("id", patternId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load pattern: ${error.message}`)
  }

  return data as { id: string; name: string; service_name: string | null; summary: string | null; author: string | null; updated_at: string | null; is_public: boolean } | null
}

const normalizeStoragePath = (value: string | null | undefined) => (value ? value.replace(/^\/+/, "") : null)

const resolveCaptureImageUrl = async (client: ServiceSupabaseClient, record: CaptureRecord): Promise<string> => {
  const normalizedPath = normalizeStoragePath(record.storagePath)
  if (normalizedPath) {
    const { data, error } = await client.storage
      .from(SHARE_BUCKET)
      .createSignedUrl(normalizedPath, SIGNED_URL_EXPIRATION_SECONDS)

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }
  }

  const publicUrl = record.publicUrl?.trim()
  if (publicUrl) {
    const parsed = parseSupabaseObjectPath(publicUrl)
    if (parsed) {
      const { data, error } = await client.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.objectPath, SIGNED_URL_EXPIRATION_SECONDS)
      if (!error && data?.signedUrl) {
        return data.signedUrl
      }
    }
    try {
      const external = new URL(publicUrl)
      if (external.protocol && external.host) {
        return publicUrl
      }
    } catch {
      // fall through to relative normalization
    }
    return `/${publicUrl.replace(/^\/+/, "")}`
  }

  return ""
}

const loadPatternCaptures = async (client: ServiceSupabaseClient, patternId: string): Promise<Capture[]> => {
  const repo = createCapturesRepository(client)
  const records = await repo.listByPattern({ patternId })
  const capturesWithUrls = await Promise.all(
    records.map(async (record) => ({
      id: record.id,
      patternId: record.patternId,
      imageUrl: await resolveCaptureImageUrl(client, record),
      order: record.orderIndex ?? 0,
      createdAt: record.createdAt,
    } satisfies Capture)),
  )

  return capturesWithUrls.sort((a, b) => a.order - b.order)
}

type InsightRow = {
  id: string
  capture_id: string
  x: number
  y: number
  note: string | null
  created_at: string
}

type PatternTagRow = {
  tag: {
    id: string
    label: string
    type: Tag["type"]
    color: string | null
    created_at: string
  } | null
}

const loadPatternInsights = async (client: ServiceSupabaseClient, captureIds: string[]): Promise<Insight[]> => {
  const { data, error } = await client
    .from("insights")
    .select("id, capture_id, x, y, note, created_at")
    .in("capture_id", captureIds)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to load insights: ${error.message}`)
  }

  const rows = (data ?? []) as InsightRow[]

  return rows.map((row) => ({
    id: row.id,
    captureId: row.capture_id,
    x: Number(row.x),
    y: row.y,
    note: row.note ?? "",
    createdAt: row.created_at,
  }))
}

const loadPatternTags = async (client: ServiceSupabaseClient, patternId: string): Promise<Tag[]> => {
  const { data, error } = await client
    .from("pattern_tags")
    .select("tag:tags(id, label, type, color, created_at)")
    .eq("pattern_id", patternId)

  if (error) {
    throw new Error(`Failed to load tags: ${error.message}`)
  }

  const rows = (data ?? []) as PatternTagRow[]

  return rows
    .map((row) => row.tag)
    .filter((tag): tag is NonNullable<PatternTagRow["tag"]> => Boolean(tag))
    .map((tag) => ({
      id: tag.id,
      label: tag.label,
      type: tag.type,
      color: tag.color ?? undefined,
      createdAt: tag.created_at,
    }))
}

interface PatternPageProps {
  params: Promise<{ patternId: string }>
}

export async function generateMetadata({ params }: PatternPageProps): Promise<Metadata> {
  const { patternId } = await params
  const data = await fetchSharedPattern(patternId)

  const title = `${data.pattern.name} · UX Archive`
  const description = data.pattern.summary || `Explore mobile design patterns from ${data.pattern.name}.`
  const ogImage = data.captures[0]?.imageUrl ? [data.captures[0].imageUrl] : []

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage,
    },
  }
}

export default async function PatternDetailPage({ params }: PatternPageProps) {
  const { patternId } = await params
  const data = await fetchSharedPattern(patternId)

  const supabase = await getServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let canDownload = false
  if (user) {
    try {
      const plan = await loadPlanWithLimits(supabase as any, user.id)
      canDownload = plan.limits.allowDownloads
    } catch {
      // If profile loading fails, assume free plan defaults (false)
    }
  }

  return (
    <PublicPatternViewer
      pattern={data.pattern}
      captures={data.captures}
      insights={data.insights}
      isAuthenticated={Boolean(user)}
      canDownload={canDownload}
    />
  )
}
