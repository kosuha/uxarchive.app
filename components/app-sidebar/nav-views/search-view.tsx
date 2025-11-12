"use client"

import * as React from "react"
import { Check, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { TagBadge } from "@/components/tag-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyPlaceholder } from "@/components/app-sidebar/nav-views/empty-placeholder"
import { useStorageCollections } from "@/lib/use-storage-collections"
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
  const { patterns, tags } = useStorageCollections()
  const [isInputFocused, setIsInputFocused] = React.useState(false)
  const blurTimeoutRef = React.useRef<number | null>(null)

  const trimmedQuery = query.trim()
  const hasKeyword = trimmedQuery.length > 0
  const hasSelectedTags = selectedTagIds.length > 0
  const normalizedQuery = trimmedQuery.toLowerCase()

  const sortedTags = React.useMemo(
    () => [...tags].sort((a, b) => a.label.localeCompare(b.label, "ko")),
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

  const hasActiveFilters = hasKeyword || hasSelectedTags

  const selectedTags = React.useMemo(() => {
    return selectedTagIds
      .map((tagId) => sortedTags.find((tag) => tag.id === tagId))
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
  }, [selectedTagIds, sortedTags])

  const handleResultSelect = React.useCallback(
    (patternId: string) => {
      onPatternSelect?.(patternId)
    },
    [onPatternSelect]
  )

  const renderResults = () => {
    if (!patterns.length) {
      return (
        <EmptyPlaceholder
          icon={Search}
          title="아직 저장된 패턴이 없어요"
          description="좌측 탐색 영역에서 패턴을 만들어 보세요."
          className="border border-dashed border-border/70 bg-transparent"
        />
      )
    }

    if (!hasKeyword && !hasSelectedTags) {
      return (
        <></>
      )
    }

    if (!filteredPatterns.length) {
      return (
        <></>
      )
    }

    return (
      <ScrollArea className="h-full">
        <div className="space-y-2">
          {filteredPatterns.map((pattern) => (
            <button
              key={pattern.id}
              type="button"
              onClick={() => handleResultSelect(pattern.id)}
              className={cn(
                "w-full rounded-lg border border-border/70 bg-background/70 p-3 text-left shadow-sm transition",
                "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{pattern.name}</p>
                  <p className="text-xs text-muted-foreground">{pattern.serviceName}</p>
                </div>
                {pattern.captureCount > 0 && (
                  <span className="text-[11px] text-muted-foreground">{pattern.captureCount}장</span>
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
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="">
        <div className="flex flex-wrap items-center justify-between text-xs">
          <span>
            아카이브 내 검색
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={clearTagFilters}
            disabled={!hasSelectedTags}
            className="text-xs text-muted-foreground"
          >
            초기화
          </Button>
        </div>
        {sortedTags.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">등록된 태그가 아직 없어요.</p>
        ) : (
          <div className="">
            <Command className="relative border border-border/60 overflow-visible">
              <CommandInput
                value={query}
                onValueChange={setQuery}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="서비스나 패턴 키워드 혹은 태그 이름을 입력하세요"
              />
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
                    <p className="mb-2 font-medium text-foreground">선택한 태그</p>
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
                  <CommandEmpty>일치하는 태그가 없어요.</CommandEmpty>
                  <CommandGroup heading="전체 태그">
                    {sortedTags.map((tag) => {
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
            </Command>
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
        )}
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
