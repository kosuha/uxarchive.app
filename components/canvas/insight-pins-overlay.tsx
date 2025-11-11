"use client"

import type { Insight } from "@/lib/types"
import { cn } from "@/lib/utils"

interface InsightPinsOverlayProps {
  insights: Insight[]
  highlightedInsightId: string | null
  onHighlight: (insightId: string | null) => void
}

export const InsightPinsOverlay = ({ insights, highlightedInsightId, onHighlight }: InsightPinsOverlayProps) => {
  if (!insights.length) return null

  return (
    <div className="relative h-full w-full">
      {insights.map((insight, index) => {
        const isHighlighted = highlightedInsightId === insight.id
        const label = index + 1
        return (
          <button
            key={insight.id}
            type="button"
            aria-label={`핀 ${label}`}
            className={cn(
              "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isHighlighted
                ? "border-primary bg-primary/90 text-primary-foreground shadow-lg"
                : "border-white/80 bg-white/80 text-slate-700 shadow",
            )}
            style={{ top: `${insight.y}%`, left: `${insight.x}%` }}
            onMouseEnter={() => onHighlight(insight.id)}
            onFocus={() => onHighlight(insight.id)}
            onMouseLeave={() => onHighlight(null)}
            onBlur={() => onHighlight(null)}
          >
            PIN {label}
          </button>
        )
      })}
    </div>
  )
}
