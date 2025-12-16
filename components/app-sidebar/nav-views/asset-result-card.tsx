"use client"

import * as React from "react"
import { FileImage } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AssetRecord } from "@/lib/repositories/assets"

export type AssetResultCardProps = {
  asset: AssetRecord
  onSelect?: (assetId: string) => void
  className?: string
}

export function AssetResultCard({ asset, onSelect, className }: AssetResultCardProps) {
  const handleSelect = React.useCallback(() => {
    onSelect?.(asset.id)
  }, [onSelect, asset.id])

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={cn(
        "w-full rounded-lg border border-border/70 bg-background/70 p-3 text-left shadow-sm transition",
        "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground truncate">
             <FileImage className="size-3.5 text-muted-foreground" />
             {asset.name}
          </p>
        </div>
      </div>
    </button>
  )
}
