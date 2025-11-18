import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicPatternViewer } from "@/components/public-view/public-pattern-viewer"
import type { Capture, Insight, Tag } from "@/lib/types"
import { createCapturesRepository } from "@/lib/repositories/captures"
import type { CaptureRecord } from "@/lib/repositories/captures"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import type { ServiceSupabaseClient } from "@/lib/supabase/service-client"

const SHARE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "ux-archive-captures"
const SIGNED_URL_EXPIRATION_SECONDS = 60 * 60

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
    try {
      const parsed = new URL(publicUrl)
      if (parsed.protocol && parsed.host) {
        return publicUrl
      }
    } catch {
      return `/${publicUrl.replace(/^\/+/, "")}`
    }
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
    y: Number(row.y),
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

export const revalidate = 0

interface SharePageProps {
  params: Promise<{ patternId: string }>
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { patternId } = await params
  const data = await fetchSharedPattern(patternId)
  return {
    title: `${data.pattern.name} · Shared pattern`,
    description: data.pattern.summary || "Read-only share view",
  }
}

export default async function SharePatternPage({ params }: SharePageProps) {
  const { patternId } = await params
  const data = await fetchSharedPattern(patternId)

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/30">
      <main className="flex flex-1 flex-col gap-6 overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex flex-1 basis-0 flex-col overflow-hidden">
          <PublicPatternViewer pattern={data.pattern} captures={data.captures} insights={data.insights} />
        </div>
      </main>
    </div>
  )
}
