import { createSupabaseServerActionClient as createClient } from "../supabase/server-clients"

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url?: string | null
  bio?: string | null
  created_at: string
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("username", username)
    .single()

  if (error) {
    console.error("Error fetching profile by username:", error)
    return null
  }

  return data
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching profile by id:", error)
    return null
  }

  return data
}
