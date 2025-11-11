"use client"

import Image from "next/image"

import type { Capture } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CaptureStripProps {
  captures: Capture[]
  selectedCaptureId: string | null
  onSelectCapture: (captureId: string) => void
  showHeading?: boolean
}

export const CaptureStrip = ({ captures, selectedCaptureId, onSelectCapture, showHeading = true }: CaptureStripProps) => {
  if (!captures.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
        캡쳐가 추가되면 하단 스트립을 통해 빠르게 이동할 수 있습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showHeading && (
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-muted-foreground">
          <span>Capture Strip</span>
          <span>{captures.length} shots</span>
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {captures.map((capture) => {
          const isActive = capture.id === selectedCaptureId
          return (
            <button
              type="button"
              key={capture.id}
              onClick={() => onSelectCapture(capture.id)}
              className={cn(
                "group relative flex w-32 shrink-0 flex-col gap-2 rounded-2xl border bg-white/70 p-2 text-left shadow-sm transition hover:border-border/70 dark:bg-card/80",
                isActive ? "border-primary/70 shadow-md" : "border-transparent",
              )}
            >
              <div className="relative h-20 w-full overflow-hidden rounded-xl bg-muted">
                <Image
                  src={capture.imageUrl}
                  alt={`${capture.order}번째 캡쳐 썸네일`}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>STEP {capture.order}</span>
                {isActive && <span className="text-primary">●</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
