import type { Metadata } from "next"

import { ShareListing } from "@/components/share/share-listing"
import { FeaturedSection } from "@/components/home/featured-section"
import { PatternsHeader } from "@/components/share/patterns-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchShareList, type ShareListItem } from "@/lib/api/share"
import { Bell, Globe, Search, SlidersHorizontal, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const SHARE_PAGE_REVALIDATE_SECONDS = 120

const DEFAULT_PAGE_SIZE = 24
const PAGE_TITLE = "Published posts"
const PAGE_DESCRIPTION = "Browse public listings shared by the community."
const PAGE_PATH = "/patterns"
const PAGE_OG_IMAGE = "/logo.svg"

const loadDiscoveryContent = async (search?: string) => {
  try {
    // If searching, only load search results
    if (search) {
      const response = await fetchShareList(
        { page: 1, perPage: DEFAULT_PAGE_SIZE, sort: "recent", includeCaptures: true, search },
        { next: { revalidate: SHARE_PAGE_REVALIDATE_SECONDS } },
      )
      return { posts: (response.items ?? []).filter((item) => item.isPublic) }
    }

    // Initial load: Fetch Editor's Pick (Recent) and Trending (Popular) in parallel
    const [recentResponse, trendingResponse] = await Promise.all([
      fetchShareList(
        { page: 1, perPage: 10, sort: "recent", includeCaptures: true },
        { next: { revalidate: SHARE_PAGE_REVALIDATE_SECONDS } }
      ),
      fetchShareList(
        { page: 1, perPage: 10, sort: "popular", includeCaptures: true },
        { next: { revalidate: SHARE_PAGE_REVALIDATE_SECONDS } }
      )
    ])

    return {
      editorsPick: (recentResponse.items ?? []).filter((item) => item.isPublic),
      trending: (trendingResponse.items ?? []).filter((item) => item.isPublic),
      posts: (recentResponse.items ?? []).filter((item) => item.isPublic), // Main list also uses recent for now
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

export default async function PatternsPage(props: {
  searchParams?: Promise<{ search?: string }>
}) {
  const searchParams = await props.searchParams
  const search = searchParams?.search || ""
  const { posts, editorsPick, trending, error } = await loadDiscoveryContent(search)

  return (
    <div className="dark min-h-screen bg-[#0C0C0C] text-foreground">
      {/* Top Header - Global Nav */}
      <PatternsHeader />

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8 space-y-12 pb-20">
        {error ? (
          <div className="mb-8 rounded-2xl border border-destructive/40 bg-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!search && (
          <>
            {/* Editor's Pick Section */}
            {editorsPick && editorsPick.length > 0 && (
              <FeaturedSection
                title="Editor's Pick"
                subtitle="Curated patterns for your inspiration."
                items={editorsPick}
              />
            )}

            {/* Trending Section */}
            {trending && trending.length > 0 && (
              <FeaturedSection
                title="Trending Now"
                subtitle="Most popular patterns this week."
                items={trending}
              />
            )}

            <div className="h-px w-full bg-white/5" />
          </>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {search ? `Results for "${search}"` : "All Patterns"}
            </h2>
          </div>
          <ShareListing initialPosts={posts} search={search} />
        </div>
      </div>
    </div>
  )
}
