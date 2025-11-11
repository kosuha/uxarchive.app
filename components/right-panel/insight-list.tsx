"use client"

import { Lightbulb } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Insight } from "@/lib/types"

import { InsightCard } from "./insight-card"

interface InsightListProps {
  insights: Insight[]
  highlightedInsightId: string | null
  onHover: (insightId: string | null) => void
  onRequestCreate: () => void
  onRequestEdit: (insight: Insight) => void
  onDelete: (insight: Insight) => void
  captureLabel?: string
  isCaptureAvailable: boolean
}

export const InsightList = ({
  insights,
  highlightedInsightId,
  onHover,
  onRequestCreate,
  onRequestEdit,
  onDelete,
  captureLabel,
  isCaptureAvailable,
}: InsightListProps) => {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Insights</p>
          <h3 className="text-xl font-semibold">Observation Stack</h3>
          <p className="text-sm text-muted-foreground">
            {captureLabel ? `${captureLabel}에 남긴 메모` : "캡쳐를 선택하면 연결된 메모가 표시됩니다."}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRequestCreate} disabled={!isCaptureAvailable}>
          + 새 인사이트
        </Button>
      </header>

      {!isCaptureAvailable ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-white/60 p-6 text-center text-sm text-muted-foreground dark:bg-card/40">
          캔버스에서 표시할 캡쳐를 먼저 선택하세요. 선택 후에 핀과 메모를 추가할 수 있습니다.
        </div>
      ) : insights.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-white/80 p-6 text-center text-sm text-muted-foreground dark:bg-card/40">
          <div className="flex flex-col items-center gap-3">
            <Lightbulb className="h-6 w-6 text-muted-foreground" />
            <p>
              아직 인사이트가 없습니다. 캔버스를 둘러보고 <span className="font-semibold text-foreground">핀 추가</span> 버튼으로 기록을 시작하세요.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              index={index}
              isHighlighted={highlightedInsightId === insight.id}
              onHover={onHover}
              onEdit={onRequestEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
