"use client"

import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null

const getEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되어 있지 않습니다.`)
  }
  return value
}

export const getBrowserSupabaseClient = () => {
  if (browserClient) return browserClient

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL")
  const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
