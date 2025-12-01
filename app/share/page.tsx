import type { Metadata } from "next"

import { ShareListing } from "@/components/share/share-listing"
import { fetchShareList, type ShareListItem } from "@/lib/api/share"

const SHARE_PAGE_REVALIDATE_SECONDS = 120
export const revalidate = SHARE_PAGE_REVALIDATE_SECONDS

const DEFAULT_PAGE_SIZE = 24
const PAGE_TITLE = "Published posts"
const PAGE_DESCRIPTION = "Browse public listings shared by the community."
const PAGE_PATH = "/share"
const PAGE_OG_IMAGE = "/logo.png"

const loadSharePosts = async (): Promise<{ posts: ShareListItem[]; error?: string }> => {
  try {
    const response = await fetchShareList(
      { page: 1, perPage: DEFAULT_PAGE_SIZE, sort: "recent" },
      { next: { revalidate: SHARE_PAGE_REVALIDATE_SECONDS } },
    )

    return {
      posts: (response.items ?? []).filter((item) => item.published && item.isPublic),
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
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: PAGE_PATH,
  },
  openGraph: {
    title: `${PAGE_TITLE} | UX Archive`,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    siteName: "UX Archive",
    type: "website",
    images: [
      {
        url: PAGE_OG_IMAGE,
        width: 300,
        height: 300,
        alt: "UX Archive logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | UX Archive`,
    description: PAGE_DESCRIPTION,
    images: [PAGE_OG_IMAGE],
  },
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
