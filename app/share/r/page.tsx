
import { Metadata } from "next"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import { listPublicRepositories } from "@/lib/repositories/repositories"
import { PublicRepositoryList } from "@/components/public-view/public-repository-list"

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
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
                <span>UX Archive</span>
                <span className="text-muted-foreground">/</span>
                <span>Repositories</span>
            </div>
        </div>
      </header>
      <main className="container mx-auto py-8">
        <PublicRepositoryList repositories={repositories} />
      </main>
    </div>
  )
}
