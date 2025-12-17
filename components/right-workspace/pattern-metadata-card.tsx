"use client"

import * as React from "react"
import { EllipsisVertical, Plus, Star, Eye, Heart, GitFork } from "lucide-react"
import { format } from "date-fns"

import { TagBadge } from "@/components/tag-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PATTERN_NAME_MAX_LENGTH, PATTERN_SERVICE_NAME_MAX_LENGTH } from "@/lib/field-limits"
import { DEFAULT_TAG_COLOR } from "@/lib/tag-constants"
import type { Pattern, Tag, TagType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ManageTagsDialog } from "@/components/tags/manage-tags-dialog"

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

export function PatternMetadataCard({ pattern, allTags, onUpdatePattern, onAssignTag, onRemoveTag, onToggleFavorite, onUpdateSummary, onCreateTag, onUpdateTag, onDeleteTag }: PatternMetadataCardProps) {
  const [serviceNameValue, setServiceNameValue] = React.useState(pattern.serviceName)
  const [nameValue, setNameValue] = React.useState(pattern.name)
  const [summaryValue, setSummaryValue] = React.useState(pattern.summary)
  const [isTagDialogOpen, setIsTagDialogOpen] = React.useState(false)
  
  const [tagOrder, setTagOrder] = React.useState<string[]>(() => pattern.tags.map((tag) => tag.id))

  React.useEffect(() => {
    setServiceNameValue(pattern.serviceName)
    setNameValue(pattern.name)
    setSummaryValue(pattern.summary)
  }, [pattern.serviceName, pattern.summary, pattern.name, pattern.id])

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
  }, [pattern.id, pattern.tags])

  React.useEffect(() => {
    const currentIds = pattern.tags.map((tag) => tag.id)
    setTagOrder((prev) => {
      const preserved = prev.filter((id) => currentIds.includes(id))
      const newOnes = currentIds.filter((id) => !preserved.includes(id))
      return [...preserved, ...newOnes]
    })
  }, [pattern.tags])

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
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Views">
          <Eye className="size-3.5" />
          <span className="text-sm font-medium tabular-nums text-foreground">{pattern.viewCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Likes">
          <Heart className="size-3.5" />
          <span className="text-sm font-medium tabular-nums text-foreground">{pattern.likeCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Forks">
          <GitFork className="size-3.5" />
          <span className="text-sm font-medium tabular-nums text-foreground">{pattern.forkCount ?? 0}</span>
        </div>
      </div>

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

        <ManageTagsDialog
          open={isTagDialogOpen}
          onOpenChange={setIsTagDialogOpen}
          allTags={allTags}
          assignedTags={orderedPatternTags}
          maxTags={MAX_PATTERN_TAGS}
          onAssignTag={async (tagId) => {
             await onAssignTag(tagId)
             setTagOrder((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]))
          }}
          onRemoveTag={async (tagId) => {
             await onRemoveTag(tagId)
             setTagOrder((prev) => prev.filter((id) => id !== tagId))
          }}
          onCreateTag={async (input, options) => {
             if (!onCreateTag) throw new Error("Create tag not supported")
             const created = await onCreateTag(input, options)
             if (pattern.tags.length < MAX_PATTERN_TAGS) {
                await onAssignTag(created.id)
                setTagOrder((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]))
             }
             return created
          }}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
        >
          <div className="flex flex-wrap gap-2">
            {orderedPatternTags.length ? (
              orderedPatternTags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
            ) : (
              <span className="text-xs text-muted-foreground">No tags yet.</span>
            )}
            
              <button
                type="button"
                className="text-muted-foreground inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 px-2.5 py-0.5 text-[11px] font-medium transition hover:border-foreground/70 hover:text-foreground"
              >
                <Plus className="size-3" />
                tags
              </button>
            
          </div>
        </ManageTagsDialog>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <MetadataItem label="Author" value={pattern.author ? `${pattern.author}` : "Unknown"} />
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

function MetadataItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

function formatDate(dateStr: string | Date): string {
  try {
    return format(new Date(dateStr), "PPP")
  } catch (e) {
    return "Unknown date"
  }
}

