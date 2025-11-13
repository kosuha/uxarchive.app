import { cookies } from "next/headers"
import { createServerClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되어 있지 않습니다.`)
  }
  return value
}

export const getServerSupabaseClient = (): SupabaseClient => {
  const cookieStore = cookies()

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: () => cookieStore,
    }
  )
}
