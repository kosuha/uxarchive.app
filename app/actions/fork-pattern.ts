"use server"

import { revalidatePath } from "next/cache"

import { createActionSupabaseClient, requireAuthenticatedUser } from "./_workspace-guards"
import { getWorkspaceMembershipAction } from "./workspaces"
import { ensurePatternCreationAllowed, ensurePrivatePatternAllowed } from "@/lib/plan-limits"
import { RepositoryError } from "@/lib/repositories/types"
import { createPatternsRepository } from "@/lib/repositories/patterns"
import { createCapturesRepository } from "@/lib/repositories/captures"
import { createInsightsRepository } from "@/lib/repositories/insights"
import { createTagsRepository } from "@/lib/repositories/tags"

export async function forkPatternAction(sourcePatternId: string) {
  if (!sourcePatternId) {
    throw new Error("Pattern ID is required.")
  }

  const supabase = await createActionSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)

  // 1. Get user's workspace
  const { workspaceId } = await getWorkspaceMembershipAction()

  // 2. Fetch source pattern (must be public or owned by user, but we are in public view context so public assume)
  // We use key directly to bypass workspace check of listPatterns for source, assuming it's public
  // However, we can use the same logic as fetchSharedPattern in page.tsx
  const { data: sourcePattern, error: patternError } = await supabase
    .from("pattern_with_counts")
    .select("*")
    .eq("id", sourcePatternId)
    .single()

  if (patternError || !sourcePattern) {
    throw new RepositoryError("Source pattern not found or not accessible.")
  }

  // 3. Check Plan Limits
  // Forking creates a PRIVATE pattern by default
  await ensurePatternCreationAllowed(supabase, user.id, workspaceId)
  await ensurePrivatePatternAllowed(supabase, user.id, workspaceId)

  // 4. Create New Pattern
  const patternsRepo = createPatternsRepository(supabase)
  
  // Clean up name or append (Forked)
  const newName = `${sourcePattern.name} (Forked)`
  
  const newPattern = await patternsRepo.create({
    workspaceId,
    name: newName,
    serviceName: sourcePattern.service_name,
    summary: sourcePattern.summary,
    author: user.user_metadata?.full_name ?? user.email ?? "Unknown", // Set author to current user
    isPublic: false, // Default to private
    isArchived: false,
    createdBy: user.id
  })

  // 5. Copy Pattern Tags
  // Need to fetch source tags
  const { data: sourceTags } = await supabase
    .from("pattern_tags")
    .select("tag_id")
    .eq("pattern_id", sourcePatternId)
  
  // 6. Copy Captures
  const capturesRepo = createCapturesRepository(supabase)
  const insightsRepo = createInsightsRepository(supabase)
  
  const sourceCaptures = await capturesRepo.listByPattern({ patternId: sourcePatternId })
  
  for (const capture of sourceCaptures) {
    const newCapture = await capturesRepo.create({
      patternId: newPattern.id,
      storagePath: capture.storagePath,
      width: capture.width,
      height: capture.height,
      mediaType: capture.mediaType,
      mimeType: capture.mimeType,
      orderIndex: capture.orderIndex,
      assetId: capture.assetId
    })
    
    // 7. Copy Insights for this capture
    const sourceInsights = await insightsRepo.listByCapture({ captureId: capture.id })
    for (const insight of sourceInsights) {
        await insightsRepo.create({
            captureId: newCapture.id,
            note: insight.note,
            x: insight.x,
            y: insight.y,
            authorId: user.id
        })
    }
  }

  revalidatePath("/workspace")
  return newPattern.id
}
