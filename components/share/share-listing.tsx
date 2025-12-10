"use client"

import { useEffect, useId, useMemo, useState, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { ShareListItem } from "@/lib/api/share"
import { getPatternsAction } from "@/app/patterns/actions"

export type ShareListingPost = ShareListItem

type SortKey = "recent" | "oldest"

type ComputedShareListItem = ShareListingPost & { listingVisible: boolean }

interface ShareListingProps {
  initialPosts: ShareListingPost[]
  search?: string
}

const SLIDE_INTERVAL_MS = 3500

const CaptureCarousel = ({ images, title }: { images: string[]; title: string }) => {
  const validImages = images.filter((url) => Boolean(url?.trim()))
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (validImages.length <= 1) return
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % validImages.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [validImages.length])

  const current = validImages[index] || ""

  return (
    <div className="relative w-full overflow-hidden bg-muted/20">
      {current ? (
        <Image
          key={current}
          src={current}
          alt={title}
          width={0}
          height={0}
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="h-auto w-full object-contain transition-transform duration-500 ease-out hover:scale-105"
          style={{ width: "100%", height: "auto" }}
          priority={false}
        />
      ) : null}

      {validImages.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 p-2 z-10">
          {validImages.map((_, dotIndex) => (
            <span
              key={`${title}-${dotIndex}`}
              className={`h-1.5 w-1.5 rounded-full transition-colors drop-shadow-md ${dotIndex === index ? "bg-white" : "bg-white/40"
                }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

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

export function ShareListing({ initialPosts, search }: ShareListingProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<ShareListingPost[]>(initialPosts)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Use a ref to track if we've already loaded the initial posts to avoid overwrite on mount
  // However, we DO want to overwrite if the prop `initialPosts` changes (e.g. from server search)
  useEffect(() => {
    setPosts(initialPosts)
    setPage(1)
    setHasMore(true) // Reset assumption that there might be more
    // Verification: If initial load is less than page size? 
    // Usually Server Action gives us that info, but here we just have the list.
    // If the list is empty or small, we might assume no more, but let's leave it true 
    // and let the first scroll trigger verification or the server logic handle it.
    // Actually, getting `hasNextPage` from the server initial load would be better, 
    // but for now we'll just try to load more if user scrolls.
    if (initialPosts.length < 24) setHasMore(false)
  }, [initialPosts, search])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    const nextPage = page + 1

    try {
      const { posts: newPosts, hasNextPage } = await getPatternsAction({
        page: nextPage,
        perPage: 24,
        search: search,
        sort: "recent",
        includeCaptures: true,
      })

      if (newPosts.length > 0) {
        setPosts((prev) => [...prev, ...newPosts])
        setPage(nextPage)
      }

      setHasMore(hasNextPage)
    } catch (error) {
      console.error("Failed to load more patterns", error)
      setHasMore(false) // Stop trying on error to prevent loops
    } finally {
      setIsLoading(false)
    }
  }, [page, hasMore, isLoading, search])

  // Intersection Observer for Infinite Scroll
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [loadMore, hasMore])


  const computedItems = useMemo<ComputedShareListItem[]>(() => {
    return posts
      .map((item) => ({ ...item, listingVisible: item.isPublic && item.published }))
      .filter((item) => item.listingVisible)
  }, [posts])

  return (
    <div className="w-full">
      {computedItems.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-20 text-center">
          <p className="text-lg font-medium text-white">No published posts found</p>
          <p className="mt-2 text-sm text-white/60">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <>
          <div className="columns-1 gap-6 sm:columns-1 lg:columns-2 xl:columns-3">
            {computedItems.map((item) => {
              const thumbnail = item.thumbnailUrl?.trim()
              const captures = (item.captureUrls || []).filter(Boolean)
              const fallbackInitial = getInitial(item.service || item.title) // Use service for initial if available
              const fallbackGradient = pickGradient(item.id || item.title)
              const targetUrl = item.publicUrl || `/patterns/${item.id}`
              const isNew = item.publishedAt && new Date(item.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

              const handleCardClick = () => router.push(targetUrl)
              const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  handleCardClick()
                }
              }

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={handleCardClick}
                  onKeyDown={handleKeyDown}
                  className="group break-inside-avoid mb-6 flex flex-col gap-4 focus-visible:outline-none hover:cursor-pointer"
                >
                  {/* Card Image */}
                  <div className="relative w-full overflow-hidden rounded-[24px] bg-[#1C1C1E] p-8 transition-all duration-300 group-hover:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-white/50">
                    {/* New Badge */}
                    {isNew && (
                      <div className="absolute left-4 top-4 z-10 rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                        New
                      </div>
                    )}

                    <div className="relative flex w-full justify-center overflow-hidden rounded-2xl">
                      {captures[0] || thumbnail ? (
                        <Image
                          src={captures[0] || thumbnail || ""}
                          alt={item.title}
                          width={0}
                          height={0}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="h-auto max-h-[500px] w-auto max-w-full rounded-2xl object-contain shadow-sm transition-transform duration-500 ease-out group-hover:scale-105"
                          style={{ width: "auto", height: "auto" }}
                          priority={false}
                        />
                      ) : (
                        <div
                          role="img"
                          aria-label={`Placeholder cover for ${item.title}`}
                          className={`flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br ${fallbackGradient} text-3xl font-semibold text-slate-700`}
                        >
                          {fallbackInitial}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col min-w-0 pt-0.5">
                      <h3 className="text-[15px] font-bold leading-tight text-white truncate">
                        {item.service || item.title}
                      </h3>
                      <p className="text-[13px] text-white/50 truncate leading-tight mt-0.5">
                        {item.service ? item.title : "Mobile Design Patterns"}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Loading Indicator / Observer Target */}
          <div ref={observerTarget} className="flex w-full items-center justify-center py-8">
            {isLoading && (
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            )}
            {!hasMore && computedItems.length > 0 && (
              <p className="text-sm text-white/20">All posts loaded</p>
            )}
          </div>
        </>
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

      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
        {cards.map((_, index) => (
          <div key={index} className="break-inside-avoid mb-4">
            <ShareCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}
