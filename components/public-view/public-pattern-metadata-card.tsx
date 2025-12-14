"use client"

import * as React from "react"

import { ForkButton } from "./fork-button"
import { DownloadButton } from "./download-button"
import { LikeButton } from "./like-button"
import { TagBadge } from "@/components/tag-badge"
import type { Tag } from "@/lib/types"
import { Eye } from "lucide-react"
import { formatCompactNumber } from "@/lib/utils"

type PublicPatternMetadataCardProps = {
  patternId: string
  patternName: string
  serviceName?: string | null
  summary?: string | null
  tags?: Tag[]
  author?: string | null
  updatedAt?: string | null
  isAuthenticated: boolean
  canDownload: boolean
  currentCaptureUrl?: string
  viewCount?: number
  likeCount?: number
  forkCount?: number
  isLiked?: boolean
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
  patternId,
  patternName,
  serviceName,
  summary,
  tags,
  author,
  updatedAt,
  isAuthenticated,
  canDownload,
  currentCaptureUrl,
  viewCount,
  likeCount,
  forkCount,
  isLiked,
}: PublicPatternMetadataCardProps) {
  const readableUpdatedAt = React.useMemo(() => formatDate(updatedAt), [updatedAt])
  const sortedTags = React.useMemo(
    () => (tags?.length ? [...tags].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []),
    [tags],
  )
  const authorLabel = author?.trim() ? `@${author.trim()}` : "Unknown"
  const updatedLabel = readableUpdatedAt || "Not available"
  const summaryLabel = summary?.trim() || ""

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 text-muted-foreground mb-2">
        <div className="flex items-center gap-1.5 text-sm font-medium" title="Total Views">
          <Eye className="size-4" />
          <span className="tabular-nums">{formatCompactNumber(viewCount ?? 0)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm font-medium">
          <LikeButton
            patternId={patternId}
            isAuthenticated={isAuthenticated}
            initialIsLiked={isLiked ?? false}
            initialCount={likeCount ?? 0}
          />
          <ForkButton
            patternId={patternId}
            isAuthenticated={isAuthenticated}
            count={forkCount ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {serviceName ? (
          <p className="text-xs font-medium text-muted-foreground">{serviceName}</p>
        ) : null}
        <h2 className="text-lg font-bold leading-tight tracking-tight text-foreground">{patternName}</h2>
      </div>

      <div className="mt-2 grid gap-6 pt-6 sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-xs font-medium tracking-wider text-muted-foreground">Author</dt>
          <dd className="text-sm font-medium text-foreground">{authorLabel}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium tracking-wider text-muted-foreground">Last updated</dt>
          <dd className="text-sm font-medium text-foreground">{updatedLabel}</dd>
        </div>
      </div>

      {sortedTags.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {sortedTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </div>
      )}

      {summaryLabel && (
        <div className="mt-6 flex-1 min-h-0">
          <div className="h-full overflow-y-auto pr-2">
            <p className="whitespace-pre-line text-sm leading-relaxed">{summaryLabel}</p>
          </div>
        </div>
      )}
    </section>
  )
}
