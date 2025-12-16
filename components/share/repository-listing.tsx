"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Loader2 } from "lucide-react"

import { RepositoryRecord } from "@/lib/repositories/repositories"
import { getPublicRepositoriesAction } from "@/app/actions/repositories"
import { RepositoryCard } from "./repository-card"

interface RepositoryListingProps {
  initialRepositories: RepositoryRecord[]
  search?: string
}

export function RepositoryListing({ initialRepositories, search }: RepositoryListingProps) {
  const [repositories, setRepositories] = useState<RepositoryRecord[]>(initialRepositories)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setRepositories(initialRepositories)
    setPage(1)
    setHasMore(true)
    if (initialRepositories.length < 24) setHasMore(false)
  }, [initialRepositories, search])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    const nextPage = page + 1

    try {
      const { repositories: newRepos, hasNextPage } = await getPublicRepositoriesAction({
        page: nextPage,
        perPage: 24,
        search: search,
        sort: "recent",
      })

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
  }, [page, hasMore, isLoading, search])

  // Intersection Observer
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

  return (
    <div className="w-full">
      {repositories.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/40 bg-muted/30 px-6 py-20 text-center">
          <p className="text-lg font-medium text-foreground">No published repositories found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <>
          <div className="columns-1 gap-6 sm:columns-1 lg:columns-2 xl:columns-3">
            {repositories.map((repo) => (
              <div key={repo.id} className="break-inside-avoid mb-6">
                <RepositoryCard repo={repo} />
              </div>
            ))}
          </div>

          <div ref={observerTarget} className="flex w-full items-center justify-center py-8">
            {isLoading && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
            {!hasMore && repositories.length > 0 && (
              <p className="text-sm text-muted-foreground/60">All repositories loaded</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
