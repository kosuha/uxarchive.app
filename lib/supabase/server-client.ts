import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"

type ServerSupabaseClient = ReturnType<typeof createServerComponentClient>

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되어 있지 않습니다.`)
  }
  return value
}

export const getServerSupabaseClient = (): ServerSupabaseClient => {
  return createServerComponentClient(
    { cookies },
    {
      supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      supabaseKey: requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    }
  )
}
