import { cookies } from "next/headers"
import { createRouteHandlerClient, createServerActionClient } from "@supabase/auth-helpers-nextjs"

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is not set.`)
  }
  return value
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

const resolveCookieStore = async () => {
  return cookies()
}

const createRouteClient = async () => {
  const cookieStore = await resolveCookieStore()
  // The Supabase helper types still expect the legacy synchronous cookies() signature.
  const context = { cookies: () => cookieStore } as unknown as {
    cookies: () => ReturnType<typeof cookies>
  }
  return createRouteHandlerClient(
    context,
    { supabaseUrl, supabaseKey: supabaseAnonKey },
  )
}

const createServerAction = async () => {
  const cookieStore = await resolveCookieStore()
  const context = { cookies: () => cookieStore } as unknown as {
    cookies: () => ReturnType<typeof cookies>
  }
  return createServerActionClient(
    context,
    { supabaseUrl, supabaseKey: supabaseAnonKey },
  )
}

export const createSupabaseRouteHandlerClient = async () => createRouteClient()
export const createSupabaseServerActionClient = async () => createServerAction()
