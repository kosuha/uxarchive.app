"use client"

import * as React from "react"
import { Folder } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"

export type FolderResultCardProps = {
  folder: RepositoryFolderRecord
  onSelect?: (folderId: string) => void
  className?: string
}

export function FolderResultCard({ folder, onSelect, className }: FolderResultCardProps) {
  const handleSelect = React.useCallback(() => {
    onSelect?.(folder.id)
  }, [onSelect, folder.id])

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
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground truncate">
             <Folder className="size-3.5 text-muted-foreground" />
             {folder.name}
          </p>
        </div>
      </div>
      {folder.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-5">{folder.description}</p>
      )}
    </button>
  )
}
