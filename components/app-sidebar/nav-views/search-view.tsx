"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { TagBadge } from "@/components/tag-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PatternResultCard } from "@/components/app-sidebar/nav-views/pattern-result-card"
import { useWorkspaceData } from "@/lib/workspace-data-context"
import { cn } from "@/lib/utils"

export type SearchViewProps = {
  onPatternSelect?: (patternId: string) => void
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  selectedTagIds: string[]
  setSelectedTagIds: React.Dispatch<React.SetStateAction<string[]>>
}

export function SearchView({
  onPatternSelect,
  query,
  setQuery,
  selectedTagIds,
  setSelectedTagIds,
}: SearchViewProps) {
  const { patterns, tags, loading, error } = useWorkspaceData()
  const [isInputFocused, setIsInputFocused] = React.useState(false)
  const blurTimeoutRef = React.useRef<number | null>(null)

  const trimmedQuery = query.trim()
  const hasKeyword = trimmedQuery.length > 0
  const hasSelectedTags = selectedTagIds.length > 0
  const normalizedQuery = trimmedQuery.toLowerCase()

  const sortedTags = React.useMemo(
    () => [...tags].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tags]
  )

  const toggleTag = React.useCallback(
    (tagId: string) => {
      setSelectedTagIds((prev) =>
        prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
      )
    },
    [setSelectedTagIds]
  )

  const clearTagFilters = React.useCallback(() => {
    setSelectedTagIds([])
    setQuery("")
  }, [setQuery, setSelectedTagIds])

  const handleInputFocus = React.useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsInputFocused(true)
  }, [])

  const handleInputBlur = React.useCallback(() => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsInputFocused(false)
      blurTimeoutRef.current = null
    }, 120)
  }, [])

  React.useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
    }
  }, [])

  const filteredPatterns = React.useMemo(() => {
    if (!hasKeyword && !hasSelectedTags) return []

    return patterns.filter((pattern) => {
      const matchesQuery =
        !hasKeyword ||
        pattern.name.toLowerCase().includes(normalizedQuery) ||
        pattern.serviceName.toLowerCase().includes(normalizedQuery) ||
        pattern.summary.toLowerCase().includes(normalizedQuery) ||
        pattern.tags.some((tag) => tag.label.toLowerCase().includes(normalizedQuery))

      const matchesTags =
        !hasSelectedTags || selectedTagIds.every((tagId) => pattern.tags.some((tag) => tag.id === tagId))

      return matchesQuery && matchesTags
    })
  }, [hasKeyword, hasSelectedTags, normalizedQuery, patterns, selectedTagIds])

  const selectedTags = React.useMemo(() => {
    return selectedTagIds
      .map((tagId) => sortedTags.find((tag) => tag.id === tagId))
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
  }, [selectedTagIds, sortedTags])

  const matchingTags = React.useMemo(() => {
    if (!hasKeyword) return []
    return sortedTags.filter((tag) => tag.label.toLowerCase().includes(normalizedQuery))
  }, [hasKeyword, normalizedQuery, sortedTags])

  const handleResultSelect = React.useCallback(
    (patternId: string) => {
      onPatternSelect?.(patternId)
    },
    [onPatternSelect]
  )

  const renderResults = () => {
    if (loading) {
      return (
        <div className="text-xs text-muted-foreground">Loading patterns...</div>
      )
    }

    if (error) {
      return <div className="text-xs text-destructive">{error}</div>
    }

    if (!patterns.length) {
      return (
        <></>
      )
    }

    if (!hasKeyword && !hasSelectedTags) {
      return (
        <p className="text-xs text-muted-foreground">Enter a query or choose tags to see results.</p>
      )
    }

    if (!filteredPatterns.length) {
      return <p className="text-xs text-muted-foreground">No patterns match your filters.</p>
    }

    return (
      <ScrollArea className="h-full">
        <div className="space-y-2">
          {filteredPatterns.map((pattern) => (
            <PatternResultCard
              key={pattern.id}
              pattern={pattern}
              onSelect={handleResultSelect}
            />
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="">
        <div className="flex flex-wrap justify-between text-muted-foreground text-xs font-medium gap-2 mb-2 items-center">
          <span>
            Search Archive
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={clearTagFilters}
            disabled={!hasSelectedTags && !hasKeyword}
            className="text-xs text-muted-foreground p-0 m-0 h-auto"
          >
            Reset
          </Button>
        </div>
        <div className="">
          <Command className="relative border border-border/60 overflow-visible">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Enter a service, pattern keyword, or tag name"
            />
            {sortedTags.length > 0 && hasKeyword && matchingTags.length > 0 && (
              <div
                className={cn(
                  "absolute left-0 right-0 top-full z-10 mt-1 origin-top rounded-lg border border-border/60 bg-popover shadow-lg transition-all duration-150",
                  "overflow-hidden",
                  isInputFocused
                    ? "pointer-events-auto opacity-100 scale-y-100"
                    : "pointer-events-none opacity-0 scale-y-95",
                )}
                aria-hidden={!isInputFocused}
              >
                {selectedTags.length > 0 && (
                  <div className="border-b border-border/60 bg-popover px-3 py-2 text-xs">
                    <p className="mb-2 font-medium text-foreground">Selected tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className="rounded-full"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => toggleTag(tag.id)}
                        >
                          <TagBadge tag={tag} className="transition-colors hover:bg-muted/30" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <CommandList className="max-h-56">
                  <CommandGroup>
                    {matchingTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id)
                      return (
                        <CommandItem
                          key={tag.id}
                          value={`${tag.label} ${tag.type}`}
                          onSelect={() => toggleTag(tag.id)}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tag.color ?? "hsl(var(--muted-foreground))" }}
                          />
                          <span className="flex-1 text-sm">{tag.label}</span>
                          <Check
                            className={cn(
                              "size-3 text-primary",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </div>
            )}
          </Command>
          {sortedTags.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No tags have been created yet.</p>
          ) : null}
          {hasSelectedTags && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="rounded-full"
                  onClick={() => toggleTag(tag.id)}
                >
                  <TagBadge tag={tag} className="transition-colors hover:bg-muted/30" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
          <span className="text-xs text-muted-foreground">
            {filteredPatterns.length ? (`${filteredPatterns.length} results`) : ("")}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderResults()}
        </div>
      </div>
    </div>
  )
}
