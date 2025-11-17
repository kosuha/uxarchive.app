"use client"

import * as React from "react"
import { AlertTriangle, RotateCcw, WifiOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSyncStatus } from "@/lib/sync-status-context"
import { cn } from "@/lib/utils"

export function SyncStatusIndicator() {
  const { isOnline, pendingMutations, failedMutations, retryAll, retrying } = useSyncStatus()

  const hasIssue = !isOnline || failedMutations > 0
  if (!hasIssue) {
    return null
  }

  const Icon = !isOnline ? WifiOff : AlertTriangle
  const headline = !isOnline ? "Offline" : "Sync failed"
  const description = !isOnline
    ? "We'll retry automatically once your network connection is restored."
    : "Once the issue is resolved, select Retry to sync again."

  return (
    <div className="rounded-lg border border-border/70 bg-muted/50 p-3 text-xs">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", !isOnline || failedMutations ? "text-destructive" : "text-primary")} />
        <p className="flex-1 text-sm font-medium text-foreground">{headline}</p>
        {pendingMutations > 0 && (
          <Badge variant="secondary" className="text-[11px]">
            Pending {pendingMutations}
          </Badge>
        )}
        {failedMutations > 0 && (
          <Badge variant="destructive" className="text-[11px]">
            Failed {failedMutations}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-xs"
          disabled={retrying}
          onClick={() => {
            void retryAll()
          }}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          {retrying ? "Retrying" : "Retry"}
        </Button>
      </div>
    </div>
  )
}
