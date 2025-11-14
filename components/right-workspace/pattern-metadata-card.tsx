"use client"

import * as React from "react"
import { Check, Plus, Star } from "lucide-react"

import { TagBadge } from "@/components/tag-badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { Pattern, Tag } from "@/lib/types"
import { cn } from "@/lib/utils"

const MAX_PATTERN_TAGS = 7

type PatternMetadataCardProps = {
  pattern: Pattern
  allTags: Tag[]
  onUpdatePattern: (updates: Partial<Pick<Pattern, "name" | "serviceName" | "summary">>) => Promise<void> | void
  onAssignTag: (tagId: string) => Promise<void> | void
  onRemoveTag: (tagId: string) => Promise<void> | void
}

export function PatternMetadataCard({ pattern, allTags, onUpdatePattern, onAssignTag, onRemoveTag }: PatternMetadataCardProps) {
  const [serviceNameValue, setServiceNameValue] = React.useState(pattern.serviceName)
  const [nameValue, setNameValue] = React.useState(pattern.name)
  const [isTagDialogOpen, setIsTagDialogOpen] = React.useState(false)
  const [tagSearch, setTagSearch] = React.useState("")

  React.useEffect(() => {
    setServiceNameValue(pattern.serviceName)
    setNameValue(pattern.name)
  }, [pattern.serviceName, pattern.name, pattern.id])

  React.useEffect(() => {
    if (!isTagDialogOpen) {
      setTagSearch("")
    }
  }, [isTagDialogOpen])

  const sortedTags = React.useMemo(
    () => [...allTags].sort((a, b) => a.label.localeCompare(b.label, "ko")),
    [allTags]
  )

  const normalizedTagSearch = tagSearch.trim().toLowerCase()

  const filteredTags = React.useMemo(() => {
    if (!normalizedTagSearch) return sortedTags
    return sortedTags.filter((tag) =>
      tag.label.toLowerCase().includes(normalizedTagSearch) ||
      tag.type.toLowerCase().includes(normalizedTagSearch)
    )
  }, [sortedTags, normalizedTagSearch])

  const patternTagIds = React.useMemo(() => new Set(pattern.tags.map((tag) => tag.id)), [pattern.tags])
  const isTagLimitReached = pattern.tags.length >= MAX_PATTERN_TAGS

  const handleToggleTag = React.useCallback(
    async (tagId: string) => {
      try {
        const hasTag = pattern.tags.some((tag) => tag.id === tagId)
        if (hasTag) {
          await onRemoveTag(tagId)
          return
        }
        if (pattern.tags.length >= MAX_PATTERN_TAGS) {
          return
        }
        const tagToAdd = sortedTags.find((tag) => tag.id === tagId)
        if (!tagToAdd) return
        await onAssignTag(tagId)
      } catch (error) {
        console.error("태그 토글 실패", error)
      }
    },
    [onAssignTag, onRemoveTag, pattern.tags, sortedTags]
  )

  const commitServiceName = React.useCallback(async () => {
    const next = serviceNameValue.trim()
    if (next === pattern.serviceName) return
    try {
      await onUpdatePattern({ serviceName: next })
    } catch (error) {
      console.error("서비스명 업데이트 실패", error)
    }
  }, [onUpdatePattern, pattern.serviceName, serviceNameValue])

  const commitName = React.useCallback(async () => {
    const next = nameValue.trim()
    if (next === pattern.name) return
    try {
      await onUpdatePattern({ name: next })
    } catch (error) {
      console.error("패턴 이름 업데이트 실패", error)
    }
  }, [nameValue, onUpdatePattern, pattern.name])

  const handleServiceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setServiceNameValue(pattern.serviceName)
      event.currentTarget.blur()
    }
    if (event.key === "Enter") {
      event.preventDefault()
      commitServiceName()
      event.currentTarget.blur()
    }
  }

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setNameValue(pattern.name)
      event.currentTarget.blur()
    }
    if (event.key === "Enter") {
      event.preventDefault()
      commitName()
      event.currentTarget.blur()
    }
  }

  return (
    <section className="shrink-0 space-y-4 rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Input
            value={serviceNameValue}
            onChange={(event) => setServiceNameValue(event.target.value)}
            onBlur={commitServiceName}
            onKeyDown={handleServiceKeyDown}
            placeholder="서비스명을 입력하세요"
            className="text-muted-foreground rounded-none shadow-none hover:bg-primary/10 focus-visible:ring-0 focus-visible:border-none border-none bg-transparent px-0 py-0 !text-xs uppercase tracking-wide h-auto"
          />
          <Input
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            placeholder="패턴 이름을 입력하세요"
            className="!text-base font-semibold shadow-none rounded-none hover:bg-primary/10 leading-snug focus-visible:ring-0 focus-visible:border-none border-none bg-transparent px-0 py-0 h-auto"
          />
        </div>
        {pattern.isFavorite && (
          <div className="rounded-full p-2 text-primary">
            <Star className="size-4 fill-current" />
          </div>
        )}
      </div>
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <div className="flex flex-wrap gap-2">
          {pattern.tags.length ? (
            pattern.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
          ) : (
            <span className="text-xs text-muted-foreground">태그가 없습니다.</span>
          )}
          <DialogTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 px-2.5 py-0.5 text-[11px] font-medium transition hover:border-foreground/70 hover:text-foreground"
            >
              <Plus className="size-3" />
              태그 추가
            </button>
          </DialogTrigger>
        </div>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>태그 관리</DialogTitle>
            <DialogDescription>이 패턴에 연결할 태그를 추가하거나 제거하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">현재 태그</p>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {pattern.tags.length} / {MAX_PATTERN_TAGS}
                </span>
              </div>
              {pattern.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pattern.tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="rounded-full"
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      <TagBadge tag={tag} className="transition-colors hover:bg-muted/30" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">아직 선택된 태그가 없습니다.</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">전체 태그</p>
                {sortedTags.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                    아직 등록된 태그가 없습니다. 아래에서 새 태그를 추가하세요.
                  </div>
                ) : (
                  <Command className="h-40 rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden">
                    <CommandInput
                      value={tagSearch}
                      onValueChange={setTagSearch}
                      placeholder="태그 이름이나 유형을 검색하세요"
                    />
                    <CommandList className="flex-1 overflow-y-auto">
                      <CommandEmpty>일치하는 태그가 없습니다.</CommandEmpty>
                      <CommandGroup>
                        {filteredTags.map((tag) => {
                          const isSelected = patternTagIds.has(tag.id)
                          return (
                            <CommandItem
                              key={tag.id}
                              value={`${tag.label} ${tag.type}`}
                              onSelect={() => handleToggleTag(tag.id)}
                              className="flex items-center gap-3"
                              disabled={isTagLimitReached && !isSelected}
                            >
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: tag.color ?? "var(--primary)" }}
                              />
                              <div className="flex flex-1 flex-col text-left">
                                <span className="text-sm">{tag.label}</span>
                              </div>
                              <Check
                                className={cn(
                                  "size-4 text-primary transition-opacity",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <MetadataItem label="작성자" value={pattern.author} />
        <MetadataItem label="생성일" value={formatDate(pattern.createdAt)} />
      </dl>
    </section>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}
