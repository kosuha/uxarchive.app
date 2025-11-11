"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface InsightFormValues {
  note: string
  x: number
  y: number
}

interface InsightFormProps {
  mode: "create" | "edit"
  initialValues?: InsightFormValues
  captureLabel?: string
  isSaving?: boolean
  onSubmit: (values: InsightFormValues) => void
  onCancel: () => void
}

const clampPercentage = (value: number) => {
  if (Number.isNaN(value)) return 50
  return Math.min(100, Math.max(0, value))
}

export const InsightForm = ({ mode, initialValues, captureLabel, isSaving = false, onSubmit, onCancel }: InsightFormProps) => {
  const [values, setValues] = useState<InsightFormValues>(() => ({ note: initialValues?.note ?? "", x: initialValues?.x ?? 50, y: initialValues?.y ?? 50 }))
  const [error, setError] = useState<string | null>(null)

  const heading = useMemo(() => (mode === "create" ? "새 인사이트 추가" : "핀 수정"), [mode])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = values.note.trim()
    if (!trimmed) {
      setError("메모를 입력하세요.")
      return
    }
    setError(null)
    onSubmit({
      note: trimmed,
      x: clampPercentage(values.x),
      y: clampPercentage(values.y),
    })
  }

  const handleBackdropClick = () => {
    if (!isSaving) {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleBackdropClick} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg space-y-4 rounded-3xl border border-border/70 bg-white p-6 shadow-xl dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{captureLabel ?? "선택된 캡쳐"}</p>
          <h3 className="text-2xl font-semibold">{heading}</h3>
          <p className="text-sm text-muted-foreground">핀의 좌표(%)와 메모를 입력하면 캔버스와 리스트가 동시에 업데이트됩니다.</p>
        </header>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="insight-note">
            메모
          </label>
          <textarea
            id="insight-note"
            className="h-32 w-full resize-none rounded-xl border border-input bg-transparent p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={values.note}
            autoFocus
            onChange={(event) => setValues((prev) => ({ ...prev, note: event.target.value }))}
            placeholder="관찰한 포인트와 배경을 기록하세요."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="insight-x">
              X 좌표 (%)
            </label>
            <Input
              id="insight-x"
              type="number"
              min={0}
              max={100}
              step={1}
              value={values.x}
              onChange={(event) => setValues((prev) => ({ ...prev, x: Number(event.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="insight-y">
              Y 좌표 (%)
            </label>
            <Input
              id="insight-y"
              type="number"
              min={0}
              max={100}
              step={1}
              value={values.y}
              onChange={(event) => setValues((prev) => ({ ...prev, y: Number(event.target.value) }))}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
            취소
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "저장 중..." : mode === "create" ? "인사이트 추가" : "변경 사항 저장"}
          </Button>
        </div>
      </form>
    </div>
  )
}
