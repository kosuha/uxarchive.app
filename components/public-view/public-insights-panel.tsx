"use client"

import * as React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

type PublicInsight = Pick<Insight, "id" | "note" | "createdAt">

type PublicInsightsPanelProps = {
  insights: PublicInsight[]
  highlightedInsightId?: string | null
  onHighlight?: (id: string | null) => void
}

const EMPTY_NOTE_MESSAGE = "No note provided for this insight."

const formatTimestamp = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

const getTimestamp = (value?: string | null) => {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

const getCountLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`

export function PublicInsightsPanel({ insights, highlightedInsightId, onHighlight }: PublicInsightsPanelProps) {
  const sortedInsights = React.useMemo(() => {
    if (!insights.length) return []
    return [...insights].sort((a, b) => {
      const first = getTimestamp(a.createdAt)
      const second = getTimestamp(b.createdAt)
      if (first !== null && second !== null) {
        return first - second
      }
      if (first !== null) return -1
      if (second !== null) return 1
      return a.id.localeCompare(b.id)
    })
  }, [insights])

  const handleHighlight = React.useCallback(
    (insightId: string | null) => {
      onHighlight?.(insightId)
    },
    [onHighlight],
  )

  const insightRefs = React.useRef(new Map<string, HTMLDivElement>())

  React.useEffect(() => {
    if (!highlightedInsightId) return
    const target = insightRefs.current.get(highlightedInsightId)
    if (!target) return
    target.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [highlightedInsightId])

  return (
    <section className="flex h-full flex-1 basis-0 min-h-0 flex-col rounded-xl border border-border/60 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <p className="text-md font-semibold">Insights</p>
        <span className="text-xs text-muted-foreground">{getCountLabel(sortedInsights.length)}</span>
      </header>
      <div className="flex flex-1 basis-0 min-h-0 flex-col px-2 py-0">
        <ScrollArea className="flex-1 basis-0 min-h-0">
          <div className="space-y-2 pb-4 pt-4">
            {sortedInsights.length ? (
              sortedInsights.map((insight, index) => {
                const createdLabel = formatTimestamp(insight.createdAt)
                const note = insight.note?.trim() || EMPTY_NOTE_MESSAGE
                const isHighlighted = highlightedInsightId === insight.id
                return (
                  <article
                    key={insight.id}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm transition-all",
                      isHighlighted ? "border-primary/70 bg-primary/5" : "border-border/60 bg-card",
                    )}
                    ref={(node) => {
                      if (!node) {
                        insightRefs.current.delete(insight.id)
                        return
                      }
                      insightRefs.current.set(insight.id, node)
                    }}
                    tabIndex={0}
                    onMouseEnter={() => handleHighlight(insight.id)}
                    onMouseLeave={() => handleHighlight(null)}
                    onFocus={() => handleHighlight(insight.id)}
                    onBlur={() => handleHighlight(null)}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Insight #{index + 1}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">{note}</p>
                  </article>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No insights to display.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </section>
  )
}
