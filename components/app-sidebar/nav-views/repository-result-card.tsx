"use client"

import * as React from "react"
import { Eye, GitFork } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RepositoryRecord } from "@/lib/repositories/repositories"

export type RepositoryResultCardProps = {
  repository: RepositoryRecord
  onSelect?: (repositoryId: string) => void
  className?: string
}

export function RepositoryResultCard({ repository, onSelect, className }: RepositoryResultCardProps) {
  const handleSelect = React.useCallback(() => {
    onSelect?.(repository.id)
  }, [onSelect, repository.id])

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={cn(
        "w-full rounded-lg border border-border/70 bg-background/70 p-3 text-left shadow-sm transition",
        "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{repository.name}</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
               <Eye className="size-3" /> {repository.viewCount}
            </span>
            <span className="flex items-center gap-1">
               <GitFork className="size-3" /> {repository.forkCount}
            </span>
          </div>
        </div>
      </div>
      {repository.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{repository.description}</p>
      )}
    </button>
  )
}
