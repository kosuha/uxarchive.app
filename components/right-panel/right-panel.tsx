"use client"

import { useMemo, useState } from "react"

import { usePatternWorkspace } from "@/components/pattern-workspace/pattern-workspace-provider"
import type { Insight } from "@/lib/types"

import { InsightForm, type InsightFormValues } from "./insight-form"
import { InsightList } from "./insight-list"
import { MetadataHeader } from "./metadata-header"

interface FormState {
  mode: "create" | "edit"
  target?: Insight
}

export const RightPanel = () => {
  const {
    activePattern,
    activeCapture,
    insightsForActiveCapture,
    highlightedInsightId,
    setHighlightedInsightId,
    createInsight,
    updateInsight,
    deleteInsight,
  } = usePatternWorkspace()

  const [formState, setFormState] = useState<FormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const captureLabel = useMemo(() => {
    if (!activeCapture) return undefined
    return `STEP ${activeCapture.order}`
  }, [activeCapture])

  const formInitialValues = useMemo(() => {
    if (!formState) return undefined
    if (formState.mode === "edit" && formState.target) {
      return { note: formState.target.note, x: formState.target.x, y: formState.target.y }
    }
    return undefined
  }, [formState])

  const openCreateForm = () => {
    if (!activeCapture) return
    setFormState({ mode: "create" })
  }

  const openEditForm = (insight: Insight) => {
    setFormState({ mode: "edit", target: insight })
  }

  const closeForm = () => {
    if (isSaving) return
    setFormState(null)
  }

  const handleSubmit = (values: InsightFormValues) => {
    setIsSaving(true)
    try {
      if (formState?.mode === "edit" && formState.target) {
        updateInsight(formState.target.id, values)
      } else if (activeCapture) {
        createInsight({
          captureId: activeCapture.id,
          note: values.note,
          x: values.x,
          y: values.y,
        })
      }
      setFormState(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (insight: Insight) => {
    const confirmed = window.confirm("해당 인사이트를 삭제할까요? 작업은 되돌릴 수 없습니다.")
    if (!confirmed) return
    deleteInsight(insight.id)
  }

  return (
    <aside className="panel-column" data-panel="right">
      <div className="panel-scroll space-y-8 p-6">
        <MetadataHeader pattern={activePattern} />

        <InsightList
          insights={insightsForActiveCapture}
          highlightedInsightId={highlightedInsightId}
          onHover={setHighlightedInsightId}
          onRequestCreate={openCreateForm}
          onRequestEdit={openEditForm}
          onDelete={handleDelete}
          captureLabel={captureLabel}
          isCaptureAvailable={Boolean(activeCapture)}
        />
      </div>

      {formState ? (
        <InsightForm
          key={`${formState.mode}-${formState.target?.id ?? "new"}`}
          mode={formState.mode}
          initialValues={formInitialValues}
          captureLabel={captureLabel ?? activePattern?.name}
          isSaving={isSaving}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      ) : null}
    </aside>
  )
}
