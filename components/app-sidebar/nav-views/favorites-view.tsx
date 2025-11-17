"use client"

import * as React from "react"

import { PatternResultCard } from "@/components/app-sidebar/nav-views/pattern-result-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWorkspaceData } from "@/lib/workspace-data-context"

export type FavoritesViewProps = {
  onPatternSelect?: (patternId: string) => void
}

export function FavoritesView({ onPatternSelect }: FavoritesViewProps) {
  const { patterns, loading, error } = useWorkspaceData()

  const favoritePatterns = React.useMemo(() => {
    return patterns
      .filter((pattern) => pattern.isFavorite)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [patterns])

  let content: React.ReactNode = null

  if (loading) {
    content = <p className="text-xs text-muted-foreground">Loading favorites...</p>
  } else if (error) {
    content = <p className="text-xs text-destructive">{error}</p>
  } else if (!favoritePatterns.length) {
    content = (
      <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-xs text-muted-foreground">
        You haven&apos;t starred any patterns yet. Use the star on a pattern card to access it quickly.
      </div>
    )
  } else {
    content = (
      <ScrollArea className="h-full">
        <div className="space-y-2">
          {favoritePatterns.map((pattern) => (
            <PatternResultCard
              key={pattern.id}
              pattern={pattern}
              onSelect={onPatternSelect}
            />
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex-1 overflow-hidden">
        {content}
      </div>
    </div>
  )
}
