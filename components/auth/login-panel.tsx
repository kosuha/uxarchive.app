"use client"

import React from "react"
import { LogIn, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSupabaseSession } from "@/lib/supabase/session-context"

const resolveRedirectTo = () => {
  if (process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL
  }
  if (typeof window === "undefined") return undefined
  return `${window.location.origin}/api/auth/callback`
}

export const LoginPanel = () => {
  const { supabase } = useSupabaseSession()
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    const redirectTo = resolveRedirectTo()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border bg-background/95 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            UX ARCHIVE
          </p>
          <h1 className="text-2xl font-semibold">워크스페이스 로그인</h1>
          <p className="text-sm text-muted-foreground">
            Google 계정으로 로그인하여 패턴을 저장하고 인사이트를 작성하세요.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Google로 계속하기
          </Button>
          <p className="text-xs text-muted-foreground">
            처음 로그인하면 Supabase에서 OAuth 권한을 요청합니다. 승인 후에는
            자동으로 UX Archive로 돌아옵니다.
          </p>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
