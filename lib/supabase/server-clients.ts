import { cookies } from "next/headers"
import { createRouteHandlerClient, createServerActionClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되어 있지 않습니다.`)
  }
  return value
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

const resolveCookieStore = async () => await cookies()

const createRouteClient = async (): Promise<SupabaseClient> => {
  const cookieStore = await resolveCookieStore()
  return createRouteHandlerClient(
    { cookies: () => cookieStore },
    { supabaseUrl, supabaseKey: supabaseAnonKey },
  )
}

const createServerAction = async (): Promise<SupabaseClient> => {
  const cookieStore = await resolveCookieStore()
  return createServerActionClient(
    { cookies: () => cookieStore },
    { supabaseUrl, supabaseKey: supabaseAnonKey },
  )
}

export const createSupabaseRouteHandlerClient = () => createRouteClient()
export const createSupabaseServerActionClient = () => createServerAction()
