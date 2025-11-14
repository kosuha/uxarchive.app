import { createClient } from "@supabase/supabase-js"

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되어 있지 않습니다.`)
  }
  return value
}

export type ServiceSupabaseClient = ReturnType<typeof createClient>

let serviceClient: ServiceSupabaseClient | null = null

export const getServiceRoleSupabaseClient = (): ServiceSupabaseClient => {
  if (serviceClient) return serviceClient

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
  const supabaseServiceKey = requireEnv("SUPABASE_SECRET_KEY")

  serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serviceClient
}
