"use client"

import * as React from "react"
import { EllipsisVertical, Plus, Star } from "lucide-react"

import { TagBadge } from "@/components/tag-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { PATTERN_NAME_MAX_LENGTH, PATTERN_SERVICE_NAME_MAX_LENGTH, TAG_LABEL_MAX_LENGTH } from "@/lib/field-limits"
import { DEFAULT_TAG_COLOR } from "@/lib/tag-constants"
import type { Pattern, Tag, TagType } from "@/lib/types"
import { cn } from "@/lib/utils"

const MAX_PATTERN_TAGS = 7

type PatternMetadataCardProps = {
  pattern: Pattern
  allTags: Tag[]
  onUpdatePattern: (updates: Partial<Pick<Pattern, "name" | "serviceName" | "summary">>) => Promise<void> | void
  onAssignTag: (tagId: string) => Promise<void> | void
  onRemoveTag: (tagId: string) => Promise<void> | void
  onToggleFavorite?: (isFavorite: boolean) => Promise<void> | void
  onUpdateSummary: (summary: string) => Promise<void> | void
  onCreateTag?: (
    input?: { label?: string; type?: TagType; color?: string | null },
    options?: { onOptimisticCreate?: (tag: Tag) => void; onConfirmedCreate?: (tag: Tag) => void }
  ) => Promise<Tag>
  onUpdateTag?: (tagId: string, updates: Partial<Pick<Tag, "label" | "type" | "color">>) => Promise<void> | void
  onDeleteTag?: (tagId: string) => Promise<void> | void
}

const TAG_COLOR_PRESETS = [
  { color: "var(--tag-color-default)", name: "Default" },
  { color: "var(--tag-color-gray)", name: "Gray" },
  { color: "var(--tag-color-brown)", name: "Brown" },
  { color: "var(--tag-color-orange)", name: "Orange" },
  { color: "var(--tag-color-yellow)", name: "Yellow" },
  { color: "var(--tag-color-green)", name: "Green" },
  { color: "var(--tag-color-blue)", name: "Blue" },
  { color: "var(--tag-color-purple)", name: "Purple" },
  { color: "var(--tag-color-pink)", name: "Pink" },
  { color: "var(--tag-color-red)", name: "Red" },
]

export function PatternMetadataCard({ pattern, allTags, onUpdatePattern, onAssignTag, onRemoveTag, onToggleFavorite, onUpdateSummary, onCreateTag, onUpdateTag, onDeleteTag }: PatternMetadataCardProps) {
  const [serviceNameValue, setServiceNameValue] = React.useState(pattern.serviceName)
  const [nameValue, setNameValue] = React.useState(pattern.name)
  const [summaryValue, setSummaryValue] = React.useState(pattern.summary)
  const [isTagDialogOpen, setIsTagDialogOpen] = React.useState(false)
  const [tagSearch, setTagSearch] = React.useState("")
  const [isCreatingTag, setIsCreatingTag] = React.useState(false)
  const suppressSelectionRef = React.useRef(false)
  const [tagOrder, setTagOrder] = React.useState<string[]>(() => pattern.tags.map((tag) => tag.id))
  const [tagRenameDraft, setTagRenameDraft] = React.useState<{ id: string; value: string } | null>(null)
  const [tagRenameError, setTagRenameError] = React.useState<{ id: string; message: string } | null>(null)

  React.useEffect(() => {
    setServiceNameValue(pattern.serviceName)
    setNameValue(pattern.name)
    setSummaryValue(pattern.summary)
  }, [pattern.serviceName, pattern.summary, pattern.name, pattern.id])

  React.useEffect(() => {
    if (!isTagDialogOpen) {
      setTagSearch("")
    }
  }, [isTagDialogOpen])

  const sortedTags = React.useMemo(
    () => [...allTags].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
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

  const canCreateTagOption = React.useMemo(() => {
    if (!onCreateTag) return false
    if (!normalizedTagSearch) return false
    return !sortedTags.some((tag) => tag.label.toLowerCase() === normalizedTagSearch)
  }, [normalizedTagSearch, onCreateTag, sortedTags])

  const patternTagIds = React.useMemo(() => new Set(pattern.tags.map((tag) => tag.id)), [pattern.tags])
  const orderedPatternTags = React.useMemo(() => {
    const tagMap = new Map(pattern.tags.map((tag) => [tag.id, tag]))
    const ordered = tagOrder
      .map((id) => tagMap.get(id))
      .filter((tag): tag is Tag => Boolean(tag))
    const remaining = pattern.tags.filter((tag) => !tagOrder.includes(tag.id))
    return [...ordered, ...remaining]
  }, [pattern.tags, tagOrder])

  const handleFavoriteToggle = React.useCallback(() => {
    onToggleFavorite?.(!pattern.isFavorite)
  }, [onToggleFavorite, pattern.isFavorite])

  React.useEffect(() => {
    setTagOrder(pattern.tags.map((tag) => tag.id))
  }, [pattern.id])

  React.useEffect(() => {
    const currentIds = pattern.tags.map((tag) => tag.id)
    setTagOrder((prev) => {
      const preserved = prev.filter((id) => currentIds.includes(id))
      const newOnes = currentIds.filter((id) => !preserved.includes(id))
      return [...preserved, ...newOnes]
    })
  }, [pattern.tags])

  const handleToggleTag = React.useCallback(
    async (tagId: string) => {
      try {
        const hasTag = pattern.tags.some((tag) => tag.id === tagId)
        if (hasTag) {
          await onRemoveTag(tagId)
          setTagOrder((prev) => prev.filter((id) => id !== tagId))
          return
        }
        if (pattern.tags.length >= MAX_PATTERN_TAGS) {
          return
        }
        const tagToAdd = sortedTags.find((tag) => tag.id === tagId)
        if (!tagToAdd) return
        await onAssignTag(tagId)
      } catch (error) {
        console.error("Failed to toggle tag", error)
      }
    },
    [onAssignTag, onRemoveTag, pattern.tags, sortedTags]
  )

  const handleAddTag = React.useCallback(
    async (tagId: string) => {
      if (pattern.tags.some((tag) => tag.id === tagId)) return
      if (pattern.tags.length >= MAX_PATTERN_TAGS) return
      try {
        await onAssignTag(tagId)
        setTagOrder((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]))
      } catch (error) {
        console.error("Failed to add tag", error)
      }
    },
    [onAssignTag, pattern.tags]
  )

  const handleCreateTag = React.useCallback(async (label: string) => {
    if (!onCreateTag) return
    const trimmed = label.trim()
    if (!trimmed) return
    setIsCreatingTag(true)
    try {
      const created = await onCreateTag({ label: trimmed, type: "custom", color: DEFAULT_TAG_COLOR })
      setTagSearch("")
      if (pattern.tags.length < MAX_PATTERN_TAGS) {
        await onAssignTag(created.id)
        setTagOrder((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]))
      }
    } catch (error) {
      console.error("Failed to create tag", error)
    } finally {
      setIsCreatingTag(false)
    }
  }, [onAssignTag, onCreateTag, pattern.tags.length])

  const handleRenameTag = React.useCallback(async (tagId: string, value: string) => {
    if (!onUpdateTag) return
    const trimmed = value.trim()
    if (!trimmed) {
      setTagRenameError({ id: tagId, message: "Required" })
      return
    }
    const current = pattern.tags.find((tag) => tag.id === tagId)
    if (current && current.label.trim() === trimmed) {
      setTagRenameDraft(null)
      setTagRenameError(null)
      return
    }
    const duplicate = allTags.some((tag) => tag.id !== tagId && tag.label.trim().toLowerCase() === trimmed.toLowerCase())
    if (duplicate) {
      setTagRenameError({ id: tagId, message: "Duplicate" })
      setTagRenameDraft(current ? { id: tagId, value: current.label } : null)
      return
    }
    setTagRenameError(null)
    try {
      await onUpdateTag(tagId, { label: trimmed })
    } catch (error) {
      console.error("Failed to rename tag", error)
    } finally {
      setTagRenameDraft(null)
    }
  }, [allTags, onUpdateTag, pattern.tags])

  const commitServiceName = React.useCallback(async () => {
    const next = serviceNameValue.trim()
    if (next === pattern.serviceName) return
    try {
      await onUpdatePattern({ serviceName: next })
    } catch (error) {
      console.error("Failed to update service name", error)
    }
  }, [onUpdatePattern, pattern.serviceName, serviceNameValue])

  const commitName = React.useCallback(async () => {
    const next = nameValue.trim()
    if (next === pattern.name) return
    try {
      await onUpdatePattern({ name: next })
    } catch (error) {
      console.error("Failed to update pattern name", error)
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

  const commitSummary = React.useCallback(async () => {
    const next = summaryValue.trim()
    if (next === pattern.summary) return
    try {
      await onUpdateSummary(next)
    } catch (error) {
      console.error("Failed to update summary", error)
    }
  }, [onUpdateSummary, pattern.summary, summaryValue])

  const handleSummaryKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setSummaryValue(pattern.summary)
      event.currentTarget.blur()
    }
  }

  const handleSummaryBlur = () => {
    commitSummary()
  }

  return (
    <section className="flex max-h-[40vh] min-h-0 shrink-0 flex-col rounded-xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 flex-col">
            <Input
              value={serviceNameValue}
              onChange={(event) => setServiceNameValue(event.target.value)}
              onBlur={commitServiceName}
              onKeyDown={handleServiceKeyDown}
              placeholder="Enter a service name"
              maxLength={PATTERN_SERVICE_NAME_MAX_LENGTH}
              className="text-muted-foreground rounded-none shadow-none hover:bg-primary/10 focus-visible:ring-0 focus-visible:border-none border-none bg-transparent px-0 py-0 !text-xs tracking-wide h-auto"
            />
            <Input
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              onBlur={commitName}
              onKeyDown={handleNameKeyDown}
              placeholder="Enter a pattern name"
              maxLength={PATTERN_NAME_MAX_LENGTH}
              className="!text-base font-semibold shadow-none rounded-none hover:bg-primary/10 leading-snug focus-visible:ring-0 focus-visible:border-none border-none bg-transparent px-0 py-0 h-auto"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleFavoriteToggle}
            aria-pressed={pattern.isFavorite}
            aria-label={pattern.isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "rounded-full text-muted-foreground",
              pattern.isFavorite && "text-primary",
              !onToggleFavorite && "pointer-events-none opacity-50",
            )}
          >
            <Star className={cn("size-4", pattern.isFavorite && "fill-current")} />
          </Button>
        </div>
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <div className="flex flex-wrap gap-2">
          {orderedPatternTags.length ? (
            orderedPatternTags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
          ) : (
            <span className="text-xs text-muted-foreground">No tags yet.</span>
          )}
          <DialogTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 px-2.5 py-0.5 text-[11px] font-medium transition hover:border-foreground/70 hover:text-foreground"
            >
              <Plus className="size-3" />
              Add tags
            </button>
          </DialogTrigger>
        </div>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
            <DialogDescription>Add or remove tags linked to this pattern.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">Current tags (click to remove)</p>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {pattern.tags.length} / {MAX_PATTERN_TAGS}
                </span>
              </div>
              {orderedPatternTags.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {orderedPatternTags.map((tag) => (
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
                <p className="mt-2 text-xs text-muted-foreground">No tags selected yet.</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">All tags</p>
                <Command
                  className="h-48 rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden"
                  shouldFilter={false}
                >
                  <CommandInput
                    value={tagSearch}
                    onValueChange={setTagSearch}
                    placeholder="Search or create tags..."
                    maxLength={TAG_LABEL_MAX_LENGTH}
                  />
                  <CommandList className="flex-1 overflow-y-auto">
                    {canCreateTagOption && (
                      <CommandItem
                        value={`create-${tagSearch}`}
                        onSelect={() => handleCreateTag(tagSearch)}
                        className="flex items-center gap-3 bg-background text-primary"
                        disabled={isCreatingTag}
                      >
                        <Plus className="size-4" />
                        <div className="flex flex-1 flex-col text-left">
                          <span className="text-sm">Create "{tagSearch.trim()}"</span>
                        </div>
                      </CommandItem>
                    )}
                    {filteredTags.map((tag) => {
                      return (
                        <CommandItem
                          key={tag.id}
                          value={`${tag.label} ${tag.type}`}
                          onPointerDownCapture={(event) => {
                            const target = event.target as HTMLElement
                            if (target.closest('[data-tag-menu-trigger="true"]')) {
                              suppressSelectionRef.current = true
                            }
                          }}
                          onSelect={() => {
                            if (suppressSelectionRef.current) {
                              suppressSelectionRef.current = false
                              return
                            }
                            handleAddTag(tag.id)
                          }}
                          className="flex items-center gap-3"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: tag.color ?? "var(--primary)" }}
                          />
                          <div className="flex flex-1 flex-col text-left">
                            <span className="text-sm">{tag.label}</span>
                          </div>
                          <DropdownMenu
                            onOpenChange={(open) => {
                              if (open) {
                                setTagRenameDraft({ id: tag.id, value: tag.label })
                                setTagRenameError(null)
                              } else {
                                suppressSelectionRef.current = false
                                setTagRenameDraft(null)
                                setTagRenameError(null)
                              }
                            }}
                          >
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                data-tag-menu-trigger="true"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  suppressSelectionRef.current = true
                                }}
                                onPointerDown={(event) => {
                                  event.stopPropagation()
                                  suppressSelectionRef.current = true
                                }}
                                onPointerUp={(event) => {
                                  event.stopPropagation()
                                }}
                              >
                                <EllipsisVertical className="size-4" />
                                <span className="sr-only">Open tag menu</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-44"
                              onPointerDownCapture={() => {
                                suppressSelectionRef.current = true
                              }}
                              onClickCapture={() => {
                                suppressSelectionRef.current = true
                              }}
                            onKeyDownCapture={() => {
                              suppressSelectionRef.current = true
                            }}
                          >
                            <DropdownMenuLabel
                              className={cn(
                                "text-xs",
                                tagRenameError?.id === tag.id ? "text-destructive" : "text-muted-foreground"
                              )}
                            >
                              {tagRenameError?.id === tag.id ? tagRenameError.message : "Rename"}
                            </DropdownMenuLabel>
                            <div className="px-2 pb-2">
                              <Input
                                value={
                                  tagRenameDraft?.id === tag.id
                                    ? tagRenameDraft.value
                                    : tag.label
                                  }
                                  onChange={(event) => {
                                    const nextValue = event.target.value
                                    setTagRenameDraft({ id: tag.id, value: nextValue })
                                    const trimmed = nextValue.trim().toLowerCase()
                                    if (!trimmed) {
                                      setTagRenameError({ id: tag.id, message: "Required" })
                                      return
                                    }
                                    if (allTags.some((other) => other.id !== tag.id && other.label.trim().toLowerCase() === trimmed)) {
                                      setTagRenameError({ id: tag.id, message: "Duplicate" })
                                    } else {
                                      setTagRenameError(null)
                                    }
                                  }}
                                  onKeyDown={(event) => {
                                    event.stopPropagation()
                                    if (event.key === "Enter") {
                                      event.preventDefault()
                                      handleRenameTag(tag.id, tagRenameDraft?.value ?? tag.label)
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault()
                                      setTagRenameDraft({ id: tag.id, value: tag.label })
                                      setTagRenameError(null)
                                    }
                                  }}
                                  onClick={(event) => event.stopPropagation()}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onPointerUp={(event) => event.stopPropagation()}
                                  onKeyUp={(event) => event.stopPropagation()}
                                  disabled={!onUpdateTag}
                                  className={cn(
                                    "h-8 w-full",
                                    tagRenameError?.id === tag.id && "border-destructive ring-1 ring-destructive/60 focus-visible:ring-destructive"
                                  )}
                                  aria-invalid={tagRenameError?.id === tag.id}
                                />
                            </div>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  suppressSelectionRef.current = true
                                  onDeleteTag?.(tag.id)
                                }}
                                className="text-destructive focus:text-destructive"
                                disabled={!onDeleteTag}
                              >
                                Delete tag
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {TAG_COLOR_PRESETS.map(({ color, name }) => (
                                <DropdownMenuItem
                                  key={`${tag.id}-${color}`}
                                  onSelect={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    suppressSelectionRef.current = true
                                    onUpdateTag?.(tag.id, { color })
                                  }}
                                  disabled={!onUpdateTag}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className="inline-block size-3 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="truncate">{name}</span>
                                  {tag.color === color && (
                                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Current</span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CommandItem>
                      )
                    })}
                    {!canCreateTagOption && filteredTags.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Type to search or create.
                      </div>
                    )}
                  </CommandList>
                </Command>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <MetadataItem label="Author" value={pattern.author} />
          <MetadataItem label="Created" value={formatDate(pattern.createdAt)} />
        </dl>
      </div>
      <div className="mt-4 flex flex-col overflow-hidden">
        <Textarea
          value={summaryValue}
          onChange={(event) => setSummaryValue(event.target.value)}
          onKeyDown={handleSummaryKeyDown}
          onBlur={handleSummaryBlur}
          placeholder="Enter a pattern description"
          className="mt-2 flex-1 resize-none overflow-auto rounded-none border-none bg-transparent px-0 py-0 text-sm leading-relaxed shadow-none focus-visible:border-none focus-visible:ring-0"
          rows={1}
        />
      </div>
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
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}
