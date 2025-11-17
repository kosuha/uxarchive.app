"use client"

import * as React from "react"

import { ToastAction } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { useSyncStatus } from "@/lib/sync-status-context"

export const SyncStatusListener = () => {
  const { isOnline, lastErrorMessage, lastErrorMutationId, retryAll } = useSyncStatus()
  const { toast } = useToast()
  const previousOnlineRef = React.useRef<boolean | null>(null)
  const lastHandledErrorRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (previousOnlineRef.current === null) {
      previousOnlineRef.current = isOnline
      return
    }

    if (!isOnline && previousOnlineRef.current) {
      toast({
        variant: "destructive",
        title: "You're offline",
        description: "Sync will resume automatically once the network reconnects.",
      })
    } else if (isOnline && previousOnlineRef.current === false) {
      toast({
        title: "Back online",
        description: "Pending sync operations will continue now.",
      })
    }

    previousOnlineRef.current = isOnline
  }, [isOnline, toast])

  React.useEffect(() => {
    if (!lastErrorMutationId) return
    if (lastHandledErrorRef.current === lastErrorMutationId) return
    lastHandledErrorRef.current = lastErrorMutationId

    toast({
      variant: "destructive",
      title: "Sync failed",
      description: lastErrorMessage ?? "Updates failed for an unknown reason.",
      action: (
        <ToastAction altText="Retry" onClick={() => retryAll()}>
          Retry
        </ToastAction>
      ),
    })
  }, [lastErrorMessage, lastErrorMutationId, retryAll, toast])

  return null
}
