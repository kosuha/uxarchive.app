import type { Metadata } from "next"

import { ShareListing } from "@/components/share/share-listing"
import { fetchShareList, type ShareListItem } from "@/lib/api/share"

export const revalidate = 60

const DEFAULT_PAGE_SIZE = 24

const loadSharePosts = async (): Promise<{ posts: ShareListItem[]; error?: string }> => {
  try {
    const response = await fetchShareList(
      { page: 1, perPage: DEFAULT_PAGE_SIZE, sort: "recent" },
      { next: { revalidate: 60 } },
    )

    return {
      posts: (response.items ?? []).filter((item) => item.published && item.sharingEnabled),
    }
  } catch (error) {
    console.error("Failed to fetch public share listings", error)
    return {
      posts: [],
      error: "We couldn't load published posts right now. Please try again shortly.",
    }
  }
}

export const metadata: Metadata = {
  title: "Published posts",
  description: "Browse public listings shared by the community.",
}

export default async function SharePage() {
  const { posts, error } = await loadSharePosts()

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <header className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Share</div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Published posts</h1>
            <p className="text-base text-muted-foreground">Publicly shared posts curated from our community.</p>
          </div>
        </header>
        {error ? (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="mt-8">
          <ShareListing posts={posts} />
        </div>
      </div>
    </div>
  )
}
