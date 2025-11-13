"use client"

import React from "react"
import { Loader2 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useSupabaseSession } from "@/lib/supabase/session-context"

import { LoginPanel } from "./login-panel"

export const AuthGuard = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { session, loading } = useSupabaseSession()

  if (loading) {
    return <AuthLoadingState />
  }

  if (!session) {
    return <LoginPanel />
  }

  return <>{children}</>
}

const AuthLoadingState = () => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          인증 정보를 불러오고 있습니다…
        </p>
      </div>
      <div className="w-full max-w-xl space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}
