"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

import { allowContextMenuProps } from "./shared"

type InsightsPanelProps = {
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
  onDeleteInsight: (insightId: string) => void
  onUpdateInsightNote: (insightId: string, note: string) => void
  onSelectInsight?: (insightId: string) => void
  readOnly?: boolean
}

export function InsightsPanel({
  insights,
  highlightedInsightId,
  onHighlight,
  onDeleteInsight,
  onUpdateInsightNote,
  onSelectInsight,
  readOnly,
}: InsightsPanelProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const isReadOnly = Boolean(readOnly)

  React.useEffect(() => {
    if (!highlightedInsightId) return
    const listEl = listRef.current
    if (!listEl) return
    const target = listEl.querySelector<HTMLElement>(`[data-insight-card="${highlightedInsightId}"]`)
    if (!target) return
    target.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [highlightedInsightId, insights])

  return (
    <section className="flex h-full flex-1 basis-0 min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <p className="text-md font-semibold">Insights</p>
        </div>
      </header>
      <div className="flex flex-1 basis-0 min-h-0 flex-col px-2 py-0">
        <div className="flex flex-1 basis-0 min-h-0 flex-col">
          <ScrollArea className="flex-1 basis-0 min-h-0">
            <div ref={listRef} className="space-y-1 pb-2 pt-2">
              {insights.length ? (
                insights.map((insight, index) => (
                  <InsightCard
                    key={insight.clientId ?? insight.id}
                    index={index + 1}
                    insight={insight}
                    isActive={highlightedInsightId === insight.id}
                    onHighlight={onHighlight}
                    onDelete={onDeleteInsight}
                    onUpdateNote={onUpdateInsightNote}
                    onSelect={onSelectInsight}
                    readOnly={isReadOnly}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  No insights yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </section>
  )
}

type InsightCardProps = {
  insight: Insight
  index: number
  isActive: boolean
  onHighlight: (id: string | null) => void
  onDelete: (id: string) => void
  onUpdateNote: (id: string, note: string) => void
  onSelect?: (id: string) => void
  readOnly?: boolean
}

function InsightCard({
  insight,
  index,
  isActive,
  onHighlight,
  onDelete,
  onUpdateNote,
  onSelect,
  readOnly,
}: InsightCardProps) {
  const [value, setValue] = React.useState(insight.note)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const isReadOnly = Boolean(readOnly)
  const canEdit = !isReadOnly

  React.useEffect(() => {
    setValue(insight.note)
  }, [insight.note])

  const resizeTextarea = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [])

  React.useLayoutEffect(() => {
    resizeTextarea()
  }, [value, resizeTextarea])

  const commitChange = React.useCallback(() => {
    if (!canEdit) return
    const trimmed = value.trim()
    if (!trimmed) {
      setValue(insight.note)
      return
    }
    if (trimmed === insight.note) return
    onUpdateNote(insight.id, trimmed)
  }, [canEdit, value, insight.note, insight.id, onUpdateNote])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canEdit) return
    if (event.key === "Escape") {
      event.preventDefault()
      setValue(insight.note)
      event.currentTarget.blur()
      return
    }
  }

  const handleBlur = () => {
    if (!canEdit) return
    commitChange()
  }

  const cardContent = (
    <article
      data-insight-card={insight.id}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm transition-all",
        isActive ? "border-primary/70 bg-primary/5" : "border-border/60 bg-card"
      )}
      tabIndex={0}
      {...allowContextMenuProps}
      onMouseEnter={() => onHighlight(insight.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => {
        onHighlight(insight.id)
        onSelect?.(insight.id)
      }}
      onClick={() => onSelect?.(insight.id)}
      onBlur={() => onHighlight(null)}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Insight #{index}</span>
      </div>
      <Textarea
        {...allowContextMenuProps}
        ref={textareaRef}
        value={value}
        onChange={canEdit ? (event) => setValue(event.target.value) : undefined}
        onKeyDown={canEdit ? handleKeyDown : undefined}
        onBlur={canEdit ? handleBlur : undefined}
        readOnly={isReadOnly}
        aria-readonly={isReadOnly || undefined}
        placeholder="Add an insight"
        className="mt-2 w-full resize-none overflow-hidden rounded-none border-none bg-transparent px-0 py-0 text-sm leading-relaxed text-foreground shadow-none outline-none focus-visible:border-none focus-visible:ring-0"
        rows={1}
      />
    </article>
  )

  if (!canEdit) {
    return cardContent
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault()
            onDelete(insight.id)
          }}
        >
          <Trash2 className="size-3.5" />
          Delete insight
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
