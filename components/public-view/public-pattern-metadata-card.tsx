"use client"

import * as React from "react"

import { ForkButton } from "./fork-button"
import { DownloadButton } from "./download-button"
import { LikeButton } from "./like-button"
import { TagBadge } from "@/components/tag-badge"
import type { Tag } from "@/lib/types"
import { Eye } from "lucide-react"

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
  const authorLabel = author?.trim() || "Unknown"
  const updatedLabel = readableUpdatedAt || "Not available"
  const summaryLabel = summary?.trim() || ""

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        {serviceName ? (
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">{serviceName}</p>
        ) : null}
        <h2 className="text-xl font-semibold leading-tight text-foreground">{patternName}</h2>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
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
        <DownloadButton imageUrl={currentCaptureUrl} canDownload={canDownload} isAuthenticated={isAuthenticated} />

        <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 text-xs font-medium text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          <span className="tabular-nums">{viewCount ?? 0}</span>
        </div>
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
