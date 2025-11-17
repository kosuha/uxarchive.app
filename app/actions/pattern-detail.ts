"use server"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createCapturesRepository } from "@/lib/repositories/captures"
import type { CaptureRecord } from "@/lib/repositories/captures"
import { createInsightsRepository } from "@/lib/repositories/insights"
import type { InsightRecord } from "@/lib/repositories/insights"
import { RepositoryError } from "@/lib/repositories/types"

import {
  createActionSupabaseClient,
  ensureWorkspaceRole,
  requireAuthenticatedUser,
} from "./_workspace-guards"

const fetchPatternWorkspaceId = async (
  client: SupabaseClient,
  patternId: string,
): Promise<string> => {
  const { data, error } = await client
    .from("patterns")
    .select("workspace_id")
    .eq("id", patternId)
    .maybeSingle()

  if (error) {
    throw new RepositoryError(`Unable to load pattern information: ${error.message}`, {
      cause: error,
      code: error.code,
    })
  }

  if (!data) {
    throw new RepositoryError("Pattern information was not found.", { status: 404 })
  }

  return data.workspace_id as string
}

export type PatternInsightRow = {
  id: string
  capture_id: string
  x: number
  y: number
  note: string | null
  created_at: string
}

export type PatternDetailPayload = {
  captures: CaptureRecord[]
  insights: PatternInsightRow[]
}

export const getPatternDetailAction = async (
  patternId: string,
): Promise<PatternDetailPayload> => {
  if (!patternId) {
    throw new RepositoryError("patternId is required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  const workspaceId = await fetchPatternWorkspaceId(supabase, patternId)
  await ensureWorkspaceRole(supabase, workspaceId, "viewer")

  const capturesRepo = createCapturesRepository(supabase)
  const captureRecords = await capturesRepo.listByPattern({ patternId })

  let insights: PatternInsightRow[] = []
  if (captureRecords.length) {
    const { data, error } = await supabase
      .from("insights")
      .select("id, capture_id, x, y, note, created_at")
      .in(
        "capture_id",
        captureRecords.map((record) => record.id),
      )
      .order("created_at", { ascending: true })

    if (error) {
      throw new RepositoryError(`Failed to load insights: ${error.message}`, { cause: error, code: error.code })
    }

    insights = ((data ?? []) as PatternInsightRow[]).map((row) => ({
      id: row.id,
      capture_id: row.capture_id,
      x: Number(row.x),
      y: Number(row.y),
      note: row.note,
      created_at: row.created_at,
    }))
  }

  return {
    captures: captureRecords,
    insights,
  }
}

type UpdateCaptureOrderInput = {
  patternId: string
  orderedIds: string[]
}

export const updateCaptureOrderAction = async (
  input: UpdateCaptureOrderInput,
): Promise<void> => {
  if (!input?.patternId) {
    throw new RepositoryError("patternId is required.")
  }

  if (!input.orderedIds.length) {
    return
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  const workspaceId = await fetchPatternWorkspaceId(supabase, input.patternId)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  for (const [index, captureId] of input.orderedIds.entries()) {
    const { error } = await supabase
      .from("captures")
      .update({ order_index: index + 1 })
      .eq("pattern_id", input.patternId)
      .eq("id", captureId)

    if (error) {
      throw new RepositoryError(`Failed to update capture order: ${error.message}`, {
        cause: error,
        code: error.code,
      })
    }
  }
}

type CreateInsightActionInput = {
  patternId: string
  captureId: string
  x: number
  y: number
  note?: string
}

export const createInsightAction = async (
  input: CreateInsightActionInput,
): Promise<InsightRecord> => {
  if (!input?.patternId || !input.captureId) {
    throw new RepositoryError("patternId and captureId are required.")
  }

  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)
  const workspaceId = await fetchPatternWorkspaceId(supabase, input.patternId)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  const repo = createInsightsRepository(supabase)
  return repo.create({
    captureId: input.captureId,
    x: input.x,
    y: input.y,
    note: input.note ?? "",
    authorId: user.id,
  })
}

type UpdateInsightActionInput = {
  patternId: string
  captureId: string
  insightId: string
  x?: number
  y?: number
  note?: string
}

export const updateInsightAction = async (
  input: UpdateInsightActionInput,
): Promise<InsightRecord> => {
  if (!input?.patternId || !input.captureId || !input.insightId) {
    throw new RepositoryError("patternId, captureId, and insightId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  const workspaceId = await fetchPatternWorkspaceId(supabase, input.patternId)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  const repo = createInsightsRepository(supabase)
  return repo.update({
    captureId: input.captureId,
    insightId: input.insightId,
    x: input.x,
    y: input.y,
    note: input.note,
  })
}

type DeleteInsightActionInput = {
  patternId: string
  captureId: string
  insightId: string
}

export const deleteInsightAction = async (
  input: DeleteInsightActionInput,
): Promise<void> => {
  if (!input?.patternId || !input.captureId || !input.insightId) {
    throw new RepositoryError("patternId, captureId, and insightId are required.")
  }

  const supabase = await createActionSupabaseClient()
  await requireAuthenticatedUser(supabase)
  const workspaceId = await fetchPatternWorkspaceId(supabase, input.patternId)
  await ensureWorkspaceRole(supabase, workspaceId, "editor")

  const repo = createInsightsRepository(supabase)
  await repo.remove({ captureId: input.captureId, insightId: input.insightId })
}
