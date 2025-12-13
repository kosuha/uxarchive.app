import type { Metadata } from "next"

import { ShareListing } from "@/components/share/share-listing"
import { SearchInput } from "@/components/share/search-input"
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

const loadSharePosts = async (search?: string): Promise<{ posts: ShareListItem[]; error?: string }> => {
  try {
    const response = await fetchShareList(
      { page: 1, perPage: DEFAULT_PAGE_SIZE, sort: "recent", includeCaptures: true, search },
      { next: { revalidate: SHARE_PAGE_REVALIDATE_SECONDS } },
    )

    return {
      posts: (response.items ?? []).filter((item) => item.isPublic),
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
  const { posts, error } = await loadSharePosts(search)

  return (
    <div className="dark min-h-screen bg-[#0C0C0C] text-foreground">
      {/* Top Header - Global Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0C0C0C]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-around px-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex items-center justify-start gap-4 w-32">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={50}
                height={50}
                className="h-12 w-12"
              />
            </Link>
          </div>

          {/* Center: Search */}
          <div className="hidden flex-1 items-center justify-center px-8 md:flex">
            <SearchInput />
          </div>

          {/* Right: Actions */}
          <div className="flex w-32 items-center justify-end gap-2 sm:gap-4">
            {/* Mobile Search Icon (visible only on small screens) */}
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white md:hidden">
              <Search className="h-5 w-5" />
            </Button>
            <Link href="/workspace">
              <Button
                variant="ghost"
                className="px-3 ml-1 rounded-full overflow-hidden border border-white/10">
                Workspace
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-8 rounded-2xl border border-destructive/40 bg-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <ShareListing initialPosts={posts} search={search} />
      </div>
    </div>
  )
}
