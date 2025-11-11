"use client"

import type { FocusEvent } from "react"

import { MapPin, PencilLine, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

const createdFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

interface InsightCardProps {
  insight: Insight
  index: number
  isHighlighted: boolean
  onHover: (insightId: string | null) => void
  onEdit: (insight: Insight) => void
  onDelete: (insight: Insight) => void
}

export const InsightCard = ({ insight, index, isHighlighted, onHover, onEdit, onDelete }: InsightCardProps) => {
  const createdLabel = createdFormatter.format(new Date(insight.createdAt))
  const pinLabel = index + 1
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      onHover(null)
    }
  }

  return (
    <article
      className={cn(
        "group rounded-2xl border bg-white/70 p-4 text-sm shadow-sm transition hover:border-primary/40 dark:bg-card/70",
        isHighlighted ? "border-primary/60 shadow-md" : "border-border/60",
      )}
      tabIndex={0}
      onMouseEnter={() => onHover(insight.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(insight.id)}
      onBlur={handleBlur}
    >
      <header className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>
          PIN <strong className={cn("ml-1 font-semibold", isHighlighted && "text-primary")}>{pinLabel}</strong>
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => onEdit(insight)}
            aria-label="핀 편집"
          >
            <PencilLine className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => onDelete(insight)}
            aria-label="핀 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <p className="pt-3 text-sm leading-relaxed text-foreground">{insight.note}</p>

      <footer className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-medium">
          <MapPin className="h-3.5 w-3.5" />
          {Math.round(insight.x)}%, {Math.round(insight.y)}%
        </span>
        <span>{createdLabel}</span>
      </footer>
    </article>
  )
}
