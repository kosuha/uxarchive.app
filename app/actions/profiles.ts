"use server"

import { revalidatePath } from "next/cache"
import { createActionSupabaseClient, requireAuthenticatedUser } from "./_workspace-guards"

export async function updateProfileAction(username: string) {
  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)

  // Validate username format
  const sanitizedUsername = username.trim().toLowerCase()
  if (!sanitizedUsername || sanitizedUsername.length < 3) {
    throw new Error("Username must be at least 3 characters long.")
  }
  
  if (!/^[a-z0-9_]+$/.test(sanitizedUsername)) {
    throw new Error("Username can only contain letters, numbers, and underscores.")
  }

  // Check uniqueness
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", sanitizedUsername)
    .neq("id", user.id) // Exclude self
    .single()

  if (existingUser) {
    throw new Error("This username is already taken.")
  }

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({ username: sanitizedUsername })
    .eq("id", user.id)

  if (error) {
    console.error("Profile update failed", error)
    throw new Error("Failed to update profile.")
  }

  // Update auth metadata to keep session in sync
  const { error: authError } = await supabase.auth.updateUser({
    data: { username: sanitizedUsername }
  })

  if (authError) {
    console.warn("Failed to update auth metadata", authError)
  }

  // Update session metadata manually not supported directly via updateAction, 
  // but we should revalidate paths where username is used.
  // Note: Session metadata won't update immediately without re-login or session refresh, 
  // so the frontend might need to rely on fetched profile data or force refresh.
  
  revalidatePath("/", "layout")
  return { success: true, username: sanitizedUsername }
}

export async function getProfileAction() {
  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)

  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single()

  if (error) {
    console.error("Failed to fetch profile", error)
    return null
  }

  return data
}
