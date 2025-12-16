"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { ShareListItem } from "@/lib/api/share"
import { getPatternsAction } from "@/app/patterns/actions"
import { ShareCard } from "./share-card"

export type ShareListingPost = ShareListItem

type ComputedShareListItem = ShareListingPost & { listingVisible: boolean }

interface ShareListingProps {
  initialPosts: ShareListingPost[]
  search?: string
  userId?: string
}

export function ShareListing({ initialPosts, search, userId }: ShareListingProps) {
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
        userId: userId,
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
      .map((item) => ({ ...item, listingVisible: item.isPublic }))
      .filter((item) => item.listingVisible)
  }, [posts])

  return (
    <div className="w-full">
      {computedItems.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/40 bg-muted/30 px-6 py-20 text-center">
          <p className="text-lg font-medium text-foreground">No published posts found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <>
          <div className="columns-1 gap-6 sm:columns-1 lg:columns-2 xl:columns-3">
            {computedItems.map((item) => (
              <div key={item.id} className="break-inside-avoid mb-6">
                <ShareCard item={item} />
              </div>
            ))}
          </div>

          {/* Loading Indicator / Observer Target */}
          <div ref={observerTarget} className="flex w-full items-center justify-center py-8">
            {isLoading && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
            {!hasMore && computedItems.length > 0 && (
              <p className="text-sm text-muted-foreground/60">All posts loaded</p>
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
