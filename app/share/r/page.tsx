import type { Metadata } from "next"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import { listPublicRepositories } from "@/lib/repositories/repositories"
import { PublicRepositoryList } from "@/components/public-view/public-repository-list"
import { PatternsHeader } from "@/components/share/patterns-header"

export const metadata: Metadata = {
  title: "Shared Repositories · UX Archive",
  description: "Explore shared repositories of UX patterns and flows.",
}

// Revalidate every hour
export const revalidate = 3600

export default async function SharedRepositoriesPage() {
  const supabase = getServiceRoleSupabaseClient()
  const repositories = await listPublicRepositories(supabase as any)

  return (
    <div className="dark min-h-screen bg-[#0C0C0C] text-foreground">
      <PatternsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8 space-y-12 pb-20">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              All Repositories
            </h2>
          </div>
          <PublicRepositoryList repositories={repositories} />
        </div>
      </div>
    </div>
  )
}
