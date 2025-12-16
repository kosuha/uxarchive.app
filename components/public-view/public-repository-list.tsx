"use client"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { RepositoryCard } from "@/components/share/repository-card"

interface PublicRepositoryListProps {
  repositories: RepositoryRecord[]
}

export function PublicRepositoryList({ repositories }: PublicRepositoryListProps) {
  if (repositories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-20 text-center">
        <p className="text-lg font-medium text-white">No public repositories found</p>
        <p className="mt-2 text-sm text-white/60">Be the first to share a repository!</p>
      </div>
    )
  }

  return (
    <div className="columns-1 gap-6 sm:columns-1 lg:columns-2 xl:columns-3">
      {repositories.map((repo) => (
        <div key={repo.id} className="break-inside-avoid mb-6">
          <RepositoryCard repo={repo} />
        </div>
      ))}
    </div>
  )
}

