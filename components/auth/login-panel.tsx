"use client"

import React from "react"
import { LogIn, Loader2 } from "lucide-react"
import { useSearchParams, usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useSupabaseSession } from "@/lib/supabase/session-context"

const resolveRedirectTo = (nextPath: string = "/workspace") => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  const origin = siteUrl || (typeof window !== "undefined" ? window.location.origin : undefined)
  if (!origin) return undefined
  return `${origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`
}

export const LoginPanel = () => {
  const { supabase } = useSupabaseSession()
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    let nextPath = "/workspace"
    const paramNext = searchParams.get("next")

    if (paramNext) {
      nextPath = paramNext
    } else if (pathname && pathname !== "/login") {
      // If we are showing this panel on a protected page (via AuthGuard),
      // we want to return to the current page.
      // We also preserve existing search params.
      const currentSearch = searchParams.toString()
      nextPath = pathname + (currentSearch ? `?${currentSearch}` : "")
    }

    const redirectTo = resolveRedirectTo(nextPath)

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
      <div className="w-full max-w-md rounded-2xl border bg-background/95 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <p className="text-sm uppercase text-muted-foreground">
            UX ARCHIVE
          </p>
          <h1 className="text-2xl font-semibold">Sign In With Google</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with Google to save patterns and capture insights.
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
            Continue with Google
          </Button>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
