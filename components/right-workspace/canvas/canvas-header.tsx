import * as React from "react"

import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

type CanvasHeaderProps = {
  captureOrder: number
  totalCount: number
  isAddingInsight: boolean
  onAddInsight: () => void
  canAddInsight: boolean
  shareButton?: React.ReactNode
  readOnly?: boolean
}

export function CanvasHeader({
  captureOrder,
  totalCount,
  isAddingInsight,
  onAddInsight,
  canAddInsight,
  shareButton,
  readOnly,
}: CanvasHeaderProps) {
  const isReadOnly = Boolean(readOnly)

  return (
    <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Current capture
        </p>
        <p className="text-lg font-semibold">
          {captureOrder ? `${captureOrder} / ${totalCount}` : "-"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!isReadOnly && (
          <Button
            variant={isAddingInsight ? "default" : "outline"}
            size="sm"
            onClick={onAddInsight}
            disabled={!canAddInsight}
            aria-pressed={isAddingInsight}
          >
            <MessageCircle className="size-3.5 mr-2" />
            {isAddingInsight ? "Cancel" : "Add insight"}
          </Button>
        )}
        {!isReadOnly && shareButton}
      </div>
    </div>
  )
}
