import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerComponentClient>>

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is not set.`)
  }
  return value
}

export const getServerSupabaseClient = async (): Promise<ServerSupabaseClient> => {
  const cookieStore = await cookies()
  return createServerComponentClient(
    { cookies: () => cookieStore },
    {
      supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      supabaseKey: requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    }
  )
}
