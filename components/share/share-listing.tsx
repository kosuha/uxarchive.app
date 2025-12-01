"use client"

import { useId, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { ShareListItem } from "@/lib/api/share"

export type ShareListingPost = ShareListItem

type SortKey = "recent" | "oldest"

type ComputedShareListItem = ShareListingPost & { listingVisible: boolean }

const FALLBACK_GRADIENTS = [
  "from-amber-100 via-orange-200 to-orange-300",
  "from-blue-100 via-indigo-200 to-indigo-300",
  "from-emerald-100 via-teal-200 to-teal-300",
  "from-rose-100 via-pink-200 to-pink-300",
  "from-slate-100 via-slate-200 to-slate-300",
  "from-violet-100 via-purple-200 to-purple-300",
]

const pickGradient = (seed: string) => {
  const normalized = seed || "gradient"
  const hash = normalized
    .split("")
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 997, 7)
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length]
}

const getInitial = (value: string) => (value?.trim()?.charAt(0) || "?").toUpperCase()

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export function ShareListing({ posts }: { posts: ShareListingPost[] }) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("recent")
  const searchInputId = useId()
  const sortSelectId = useId()

  const computedItems = useMemo<ComputedShareListItem[]>(() => {
    const withListing = posts.map((item) => ({ ...item, listingVisible: item.isPublic && item.published }))

    const filtered = withListing.filter((item) => {
      if (!item.listingVisible) return false

      const matchesQuery = query
        ? [item.title, item.service, item.author, ...(item.tags ?? [])]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())
        : true

      return matchesQuery
    })

    const sorted = filtered.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime()
      const bTime = new Date(b.updatedAt).getTime()
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0
      return sortKey === "recent" ? bTime - aTime : aTime - bTime
    })

    return sorted
  }, [posts, query, sortKey])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-card/50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:w-2/3 sm:flex-row sm:items-center">
          <Label htmlFor={searchInputId} className="sr-only">
            Search posts
          </Label>
          <Input
            id={searchInputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, tag, or author"
            className="w-full"
            />
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <span>Sort</span>
            <Label htmlFor={sortSelectId} className="sr-only">
              Sort posts
            </Label>
            <select
              id={sortSelectId}
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      </div>

      {computedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card/40 px-6 py-12 text-center">
          <p className="text-lg font-semibold">No published posts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Publish a shared post to see it on this list.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {computedItems.map((item) => {
            if (!item.listingVisible) return null
            const tags = item.tags ?? []
            const thumbnail = item.thumbnailUrl?.trim()
            const fallbackInitial = getInitial(item.title)
            const fallbackGradient = pickGradient(item.id || item.title)
            return (
              <div key={item.id} className="flex h-full flex-col overflow-hidden rounded-xl border bg-card/70 shadow-sm">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={item.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-105"
                      priority={false}
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={`Placeholder cover for ${item.title}`}
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${fallbackGradient} text-3xl font-semibold text-slate-700`}
                    >
                      {fallbackInitial}
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <Badge variant="secondary">Published</Badge>
                    {item.views ? <Badge variant="outline">{item.views} views</Badge> : null}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Badge variant="outline">{item.service || "Unknown service"}</Badge>
                    {item.author ? <span>By {item.author}</span> : null}
                    <span className="text-[11px]">Updated {formatDate(item.updatedAt)}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold leading-tight text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.summary || "No description provided."}</p>
                  </div>

                  {tags.length ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[11px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={item.publicUrl || `/share/${item.id}`}>View</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={item.publicUrl || `/share/${item.id}`} target="_blank" rel="noreferrer noopener">
                        Open in new tab
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ShareCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card/70 shadow-sm">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="mt-auto flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  )
}

export function ShareListingSkeleton({ itemsCount = 6 }: { itemsCount?: number }) {
  const cards = Array.from({ length: Math.max(itemsCount, 3) })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-card/50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:w-2/3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-12" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((_, index) => (
          <ShareCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
