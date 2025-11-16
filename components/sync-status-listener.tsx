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
        title: "오프라인 상태입니다",
        description: "네트워크 연결이 복구되면 자동으로 동기화됩니다.",
      })
    } else if (isOnline && previousOnlineRef.current === false) {
      toast({
        title: "온라인으로 복구되었습니다",
        description: "대기 중이던 동기화가 다시 진행됩니다.",
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
      title: "동기화에 실패했습니다",
      description: lastErrorMessage ?? "알 수 없는 이유로 업데이트하지 못했습니다.",
      action: (
        <ToastAction altText="재시도" onClick={() => retryAll()}>
          재시도
        </ToastAction>
      ),
    })
  }, [lastErrorMessage, lastErrorMutationId, retryAll, toast])

  return null
}
