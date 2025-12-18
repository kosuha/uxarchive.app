"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Loader2 } from "lucide-react"

import { RepositoryRecord } from "@/lib/repositories/repositories"
import { listUserPublicRepositoriesAction } from "@/app/actions/repositories"
import { RepositoryCard } from "@/components/share/repository-card"
import { Skeleton } from "@/components/ui/skeleton"

interface PublicRepositoryListingProps {
  initialRepositories: RepositoryRecord[]
  username: string
}

export function PublicRepositoryListing({ initialRepositories, username }: PublicRepositoryListingProps) {
  const [repositories, setRepositories] = useState<RepositoryRecord[]>(initialRepositories)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Reset state if initialRepositories changes (e.g. navigation)
  useEffect(() => {
    setRepositories(initialRepositories)
    setPage(1)
    setHasMore(initialRepositories.length >= 24)
  }, [initialRepositories])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    const nextPage = page + 1

    try {
      const { repositories: newRepos, hasNextPage } = await listUserPublicRepositoriesAction(username, nextPage, 24)

      if (newRepos.length > 0) {
        setRepositories((prev) => [...prev, ...newRepos])
        setPage(nextPage)
      }

      setHasMore(hasNextPage)
    } catch (error) {
      console.error("Failed to load more repositories", error)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [page, hasMore, isLoading, username])

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

  if (repositories.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-20 text-center">
        <p className="text-lg font-medium text-white">No public repositories found</p>
        <p className="mt-2 text-sm text-white/60">Be the first to share a repository!</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="columns-1 gap-6 sm:columns-1 md:columns-2 lg:columns-3 xl:columns-5">
        {repositories.map((repo) => (
          <div key={repo.id} className="break-inside-avoid mb-6">
            <RepositoryCard repo={repo} />
          </div>
        ))}
      </div>

      {/* Loading Indicator / Observer Target */}
      <div ref={observerTarget} className="flex w-full items-center justify-center py-8">
        {isLoading && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        {!hasMore && repositories.length > 0 && (
          <p className="text-sm text-muted-foreground/60">All repositories loaded</p>
        )}
      </div>
    </div>
  )
}
