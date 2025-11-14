"use server"

import { cookies } from "next/headers"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient, User } from "@supabase/supabase-js"

import { RepositoryError } from "@/lib/repositories/types"

export type WorkspaceRole = "viewer" | "editor" | "owner"

export const createActionSupabaseClient = (): SupabaseClient => {
  return createServerActionClient({ cookies }) as SupabaseClient
}

export const requireAuthenticatedUser = async (client: SupabaseClient): Promise<User> => {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error) {
    throw new RepositoryError(`Supabase 인증 정보를 확인할 수 없습니다: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }

  if (!user) {
    throw new RepositoryError("로그인이 필요합니다.", { status: 401 })
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
    throw new RepositoryError(`워크스페이스 권한을 확인할 수 없습니다: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }

  if (data !== true) {
    throw new RepositoryError("워크스페이스에 접근할 권한이 없습니다.", { status: 403 })
  }
}
