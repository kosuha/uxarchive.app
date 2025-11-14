"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

type BrowserSupabaseClient = ReturnType<typeof createClientComponentClient>

let browserClient: BrowserSupabaseClient | null = null

const requireEnv = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되어 있지 않습니다.`)
  }
  return value
}

export const getBrowserSupabaseClient = (): BrowserSupabaseClient => {
  if (browserClient) return browserClient

  const supabaseUrl = requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL"
  )
  const supabasePublishableKey = requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  )

  browserClient = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabasePublishableKey,
  })
  return browserClient
}

export type { BrowserSupabaseClient }
