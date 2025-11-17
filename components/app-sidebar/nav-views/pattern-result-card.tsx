"use client"

import * as React from "react"

import { TagBadge } from "@/components/tag-badge"
import type { Pattern } from "@/lib/types"
import { cn } from "@/lib/utils"

export type PatternResultCardProps = {
  pattern: Pattern
  onSelect?: (patternId: string) => void
  className?: string
}

export function PatternResultCard({ pattern, onSelect, className }: PatternResultCardProps) {
  const handleSelect = React.useCallback(() => {
    onSelect?.(pattern.id)
  }, [onSelect, pattern.id])

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
        <div>
          <p className="text-sm font-semibold text-foreground">{pattern.name}</p>
          <p className="text-xs text-muted-foreground">{pattern.serviceName}</p>
        </div>
        {pattern.captureCount > 0 && (
          <span className="text-[11px] text-muted-foreground">{pattern.captureCount} captures</span>
        )}
      </div>
      {pattern.summary && (
        <p className="mt-2 text-xs text-muted-foreground">{pattern.summary}</p>
      )}
      {pattern.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pattern.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </button>
  )
}
