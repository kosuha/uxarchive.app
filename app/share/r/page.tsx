import type { Metadata } from "next"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import { listPublicRepositoriesWithPagination } from "@/lib/repositories/repositories"
import { PatternsHeader } from "@/components/share/patterns-header"
import { RepositoryListing } from "@/components/share/repository-listing"
import { FeaturedRepositoriesSection } from "@/components/share/featured-repositories-section"

export const metadata: Metadata = {
  title: "Shared Repositories · UX Archive",
  description: "Explore shared repositories of UX patterns and flows.",
}

// Revalidate every 60 seconds
export const revalidate = 60

const loadContent = async (search?: string) => {
  const supabase = getServiceRoleSupabaseClient()

  if (search) {
    const { repositories } = await listPublicRepositoriesWithPagination(supabase, {
      page: 1,
      perPage: 24,
      search,
      sort: "recent"
    })
    return { posts: repositories }
  }

  const [recentResponse, trendingResponse] = await Promise.all([
    listPublicRepositoriesWithPagination(supabase, {
      page: 1,
      perPage: 10,
      sort: "recent"
    }),
    listPublicRepositoriesWithPagination(supabase, {
      page: 1,
      perPage: 10,
      sort: "popular"
    })
  ])

  return {
    editorsPick: recentResponse.repositories,
    trending: trendingResponse.repositories,
    posts: recentResponse.repositories // Start with recent for main list
  }
}

export default async function SharedRepositoriesPage({
  searchParams
}: {
  searchParams?: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const search = params?.search || ""
  const { posts, editorsPick, trending } = await loadContent(search)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PatternsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8 space-y-12 pb-20">
        {!search && (
          <>
            {trending && trending.length > 0 && (
              <FeaturedRepositoriesSection
                title="Popular Repositories"
                subtitle="Most viewed and liked repositories."
                items={trending}
              />
            )}

            <div className="h-px w-full bg-border/40" />
          </>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {search ? `Results for "${search}"` : "All Repositories"}
            </h2>
          </div>
          <RepositoryListing initialRepositories={posts ?? []} search={search} />
        </div>
      </div>
    </div>
  )
}
