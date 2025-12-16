"use client"

import { RepositoryRecord } from "@/lib/repositories/repositories"
import { Archive, Eye, GitFork, Heart } from "lucide-react"
import Link from "next/link"

interface PublicRepositoryListProps {
  repositories: RepositoryRecord[]
}

export function PublicRepositoryList({ repositories }: PublicRepositoryListProps) {
  if (repositories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground p-8">
        <Archive className="w-12 h-12 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">No public repositories found</h2>
        <p>There are currently no public repositories shared.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {repositories.map((repo) => (
        <RepositoryCard key={repo.id} repo={repo} />
      ))}
    </div>
  )
}

function RepositoryCard({ repo }: { repo: RepositoryRecord }) {
  return (
    <Link href={`/share/r/${repo.id}`} className="block group">
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all h-full flex flex-col">
        <div className="p-6 flex-1 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Archive className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold truncate group-hover:text-primary/80 transition-colors">
                {repo.name}
              </h3>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
            {repo.description || "No description provided."}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t mt-auto">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{repo.viewCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span>{repo.likeCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              <span>{repo.forkCount}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
