"use server"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createSupabaseServerActionClient } from "@/lib/supabase/server-clients"

import { RepositoryError } from "@/lib/repositories/types"

export type WorkspaceRole = "viewer" | "editor" | "owner"

export const createActionSupabaseClient = async (): Promise<SupabaseClient> => {
  return (await createSupabaseServerActionClient()) as SupabaseClient
}

export const requireAuthenticatedUser = async (client: SupabaseClient): Promise<User> => {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error) {
    throw new RepositoryError(`Unable to load Supabase auth information: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }

  if (!user) {
    throw new RepositoryError("You must be signed in.", { status: 401 })
  }

  return user
}

export const ensureWorkspaceRole = async (
  client: SupabaseClient,
  workspaceId: string,
  minRole: WorkspaceRole,
): Promise<void> => {
  const { data, error } = await client.rpc("workspace_has_min_role", {
    target_workspace_id: workspaceId,
    min_role: minRole,
  })

  if (error) {
    throw new RepositoryError(`Unable to verify workspace permissions: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }

  if (data !== true) {
    throw new RepositoryError("You do not have permission to access this workspace.", { status: 403 })
  }
}
