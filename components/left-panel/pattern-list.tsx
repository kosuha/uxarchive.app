"use client"

import { Star } from "lucide-react"

import type { Pattern } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePatternWorkspace } from "@/components/pattern-workspace/pattern-workspace-provider"

interface PatternListProps {
  patterns: Pattern[]
  indentLevel?: number
}

export const PatternList = ({ patterns, indentLevel = 0 }: PatternListProps) => {
  const { selectedPatternId, selectPattern } = usePatternWorkspace()

  if (!patterns.length) return null

  const indent = indentLevel > 0 ? `calc(${indentLevel} * 0.75rem)` : "0px"

  return (
    <ul className="space-y-2" style={{ marginLeft: indent }}>
      {patterns.map((pattern) => (
        <li key={pattern.id}>
          <button
            type="button"
            onClick={() => selectPattern(selectedPatternId === pattern.id ? null : pattern.id)}
            aria-pressed={selectedPatternId === pattern.id}
            className={cn(
              "w-full rounded-2xl border bg-card/70 p-3 text-left shadow-sm transition hover:border-border hover:shadow-md dark:bg-card/30",
              selectedPatternId === pattern.id ? "border-primary/60 shadow-md ring-1 ring-primary/20" : "border-border/60",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{pattern.serviceName}</p>
                <p className="text-sm font-semibold leading-tight">{pattern.name}</p>
              </div>
              {pattern.isFavorite && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-100">
                  <Star className="h-3 w-3" fill="currentColor" />
                  즐겨찾기
                </span>
              )}
            </div>
            <p className="pt-2 text-xs text-muted-foreground">{pattern.summary}</p>
            <div className="flex flex-wrap gap-1.5 pt-3">
              {pattern.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    borderColor: tag.color ?? "var(--border)",
                    color: tag.color ?? "inherit",
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
            <div className="pt-3 text-[11px] text-muted-foreground">캡쳐 {pattern.captureCount}개</div>
          </button>
        </li>
      ))}
    </ul>
  )
}
