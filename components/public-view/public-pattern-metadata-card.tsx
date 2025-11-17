"use client"

import * as React from "react"

import { TagBadge } from "@/components/tag-badge"
import type { Tag } from "@/lib/types"

type PublicPatternMetadataCardProps = {
  patternName: string
  serviceName?: string | null
  summary?: string | null
  tags?: Tag[]
  author?: string | null
  updatedAt?: string | null
}

const formatDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function PublicPatternMetadataCard({
  patternName,
  serviceName,
  summary,
  tags,
  author,
  updatedAt,
}: PublicPatternMetadataCardProps) {
  const readableUpdatedAt = React.useMemo(() => formatDate(updatedAt), [updatedAt])
  const sortedTags = React.useMemo(
    () => (tags?.length ? [...tags].sort((a, b) => a.label.localeCompare(b.label, "ko")) : []),
    [tags],
  )
  const authorLabel = author?.trim() || "Unknown"
  const updatedLabel = readableUpdatedAt || "Not available"
  const summaryLabel = summary?.trim() || ""

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        {serviceName ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{serviceName}</p>
        ) : null}
        <h2 className="text-xl font-semibold leading-tight text-foreground">{patternName}</h2>
      </div>
      <dl className="mt-4 grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wide">Author</dt>
          <dd className="text-base text-xs text-foreground">{authorLabel}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide">Last updated</dt>
          <dd className="text-base text-xs text-foreground">{updatedLabel}</dd>
        </div>
      </dl>
      <div className="mt-6">
        {sortedTags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {sortedTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground"></p>
        )}
      </div>
      <div className="mt-6 flex-1 min-h-0">
        <div className="h-full overflow-y-auto pr-1">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{summaryLabel}</p>
        </div>
      </div>
    </section>
  )
}
