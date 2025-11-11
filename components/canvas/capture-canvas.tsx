"use client"

import Image from "next/image"
import type { MouseEvent, ReactNode } from "react"

import type { Capture } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CaptureCanvasProps {
  capture: Capture | null
  serviceName?: string
  patternName?: string
  totalCaptures?: number
  children?: ReactNode
  onCanvasClick?: (event: MouseEvent<HTMLDivElement>) => void
  className?: string
}

const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <div className="w-full border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground dark:bg-card/40">
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-base font-semibold text-foreground/80">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
)

export const CaptureCanvas = ({
  capture,
  serviceName,
  patternName,
  totalCaptures,
  children,
  onCanvasClick,
  className,
}: CaptureCanvasProps) => {
  if (!patternName) {
    return <Placeholder title="패턴이 선택되지 않았습니다" description="좌측 패널에서 패턴을 선택하면 주요 캡쳐가 여기 표시됩니다." />
  }

  if (!capture) {
    return <Placeholder title="연결된 캡쳐가 없습니다" description="선택한 패턴에 업로드된 캡쳐가 없어요. 추후 업로드 기능이 연결되면 이 영역에서 바로 확인할 수 있습니다." />
  }

  const currentIndexLabel = totalCaptures && totalCaptures > 0 ? `${capture.order}/${totalCaptures}` : `STEP ${capture.order}`

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border border-border/60 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-[0_30px_80px_rgba(15,23,42,0.15)] dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
        className,
      )}
      onClick={onCanvasClick}
      role={onCanvasClick ? "button" : undefined}
      tabIndex={onCanvasClick ? 0 : undefined}
    >
      <Image
        src={capture.imageUrl}
        alt={`${patternName} 캡쳐 ${capture.order}`}
        fill
        sizes="(min-width: 1280px) 960px, 100vw"
        className="object-contain"
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_60%)]" aria-hidden />
      <div className="pointer-events-none absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm backdrop-blur">
        <span>{currentIndexLabel}</span>
      </div>

      <div className={cn("absolute inset-0", children ? "" : "pointer-events-none")}>{children}</div>
    </div>
  )
}
