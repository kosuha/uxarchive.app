"use client"

import * as React from "react"
import { Pin, Trash2 } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { storageService } from "@/lib/storage"
import type { Insight, Pattern } from "@/lib/types"
import { cn } from "@/lib/utils"

import { allowContextMenuProps } from "./shared"

type InsightsPanelProps = {
  pattern: Pattern
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (id: string | null) => void
  onDeleteInsight: (insightId: string) => void
  onUpdateInsightNote: (insightId: string, note: string) => void
}

export function InsightsPanel({
  pattern,
  insights,
  highlightedInsightId,
  onHighlight,
  onDeleteInsight,
  onUpdateInsightNote,
}: InsightsPanelProps) {
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
            <div className="space-y-1 pb-2 pt-2">
              <PatternSummaryCard pattern={pattern} />
              {insights.length ? (
                insights.map((insight, index) => (
                  <InsightCard
                    key={insight.id}
                    index={index + 1}
                    insight={insight}
                    isActive={highlightedInsightId === insight.id}
                    onHighlight={onHighlight}
                    onDelete={onDeleteInsight}
                    onUpdateNote={onUpdateInsightNote}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  <Pin className="size-5" />
                  아직 인사이트가 없습니다.
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
}

function InsightCard({ insight, index, isActive, onHighlight, onDelete, onUpdateNote }: InsightCardProps) {
  const [value, setValue] = React.useState(insight.note)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

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
    const trimmed = value.trim()
    if (!trimmed) {
      setValue(insight.note)
      return
    }
    if (trimmed === insight.note) return
    onUpdateNote(insight.id, trimmed)
  }, [value, insight.note, insight.id, onUpdateNote])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setValue(insight.note)
      event.currentTarget.blur()
      return
    }
  }

  const handleBlur = () => {
    commitChange()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          className={cn(
            "rounded-xl border px-4 py-3 text-sm transition-all",
            isActive ? "border-primary/70 bg-primary/5" : "border-border/60 bg-card"
          )}
          tabIndex={0}
          {...allowContextMenuProps}
          onMouseEnter={() => onHighlight(insight.id)}
          onMouseLeave={() => onHighlight(null)}
          onFocus={() => onHighlight(insight.id)}
          onBlur={() => onHighlight(null)}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Insight #{index}</span>
          </div>
          <Textarea
            {...allowContextMenuProps}
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="인사이트를 입력하세요"
            className="mt-2 w-full resize-none overflow-hidden rounded-none border-none bg-transparent px-0 py-0 text-sm leading-relaxed text-foreground shadow-none outline-none focus-visible:border-none focus-visible:ring-0"
            rows={1}
          />
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent align="start">
        <ContextMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault()
            onDelete(insight.id)
          }}
        >
          <Trash2 className="size-3.5" />
          인사이트 삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

type PatternSummaryCardProps = {
  pattern: Pattern
}

function PatternSummaryCard({ pattern }: PatternSummaryCardProps) {
  const [value, setValue] = React.useState(pattern.summary)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setValue(pattern.summary)
  }, [pattern.summary, pattern.id])

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
    const next = value.trim()
    if (next === pattern.summary) return
    storageService.patterns.update(pattern.id, (current) => ({
      ...current,
      summary: next,
    }))
  }, [value, pattern.summary, pattern.id])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setValue(pattern.summary)
      event.currentTarget.blur()
    }
  }

  const handleBlur = () => {
    commitChange()
  }

  return (
    <article className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Description
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="패턴 설명을 입력하세요"
        rows={2}
        className="mt-2 w-full resize-none rounded-none overflow-hidden border-none bg-transparent px-0 py-0 text-sm text-foreground shadow-none outline-none focus-visible:border-none focus-visible:ring-0"
      />
    </article>
  )
}
