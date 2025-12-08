import type { Metadata } from "next"

import { ShareListing } from "@/components/share/share-listing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchShareList, type ShareListItem } from "@/lib/api/share"
import { Bell, Globe, Search, SlidersHorizontal, User } from "lucide-react"

const SHARE_PAGE_REVALIDATE_SECONDS = 120

const DEFAULT_PAGE_SIZE = 24
const PAGE_TITLE = "Published posts"
const PAGE_DESCRIPTION = "Browse public listings shared by the community."
const PAGE_PATH = "/patterns"
const PAGE_OG_IMAGE = "/logo.png"

const loadSharePosts = async (): Promise<{ posts: ShareListItem[]; error?: string }> => {
  try {
    const response = await fetchShareList(
      { page: 1, perPage: DEFAULT_PAGE_SIZE, sort: "recent", includeCaptures: true },
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

export default async function PatternsPage() {
  const { posts, error } = await loadSharePosts()

  return (
    <div className="dark min-h-screen bg-gradient-to-b from-[#0c0d12] via-[#0b0c10] to-[#090a0f] text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6">
          <header className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex items-center gap-2 text-xl font-semibold">
                    <span className="rounded-lg bg-white/10 px-3 py-1">UX</span>
                    <span className="text-muted-foreground">Archive</span>
                  </div>
                  <div className="hidden text-sm font-medium text-muted-foreground sm:inline">Community patterns</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90">Apps</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Sites
                  </Button>
                </div>
                <div className="flex flex-1 items-center gap-3 min-w-[260px]">
                  <div className="relative w-full">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/50" />
                    <Input
                      placeholder="Search patterns, apps, or services"
                      className="w-full rounded-full border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    aria-label="Toggle language"
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    aria-label="Account"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {[
                    { label: "iOS", active: true },
                    { label: "Web", active: false },
                    { label: "Android", active: false },
                    { label: "macOS", active: false },
                  ].map((chip) => (
                    <Button
                      key={chip.label}
                      size="sm"
                      variant={chip.active ? "default" : "ghost"}
                      className={`rounded-full border ${chip.active ? "bg-white text-black" : "border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                    >
                      {chip.label}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-3 px-1 text-white">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Latest", active: true },
                { label: "Most popular", active: false },
                { label: "Top rated", active: false },
                { label: "Animations", active: false },
                { label: "Collections", active: false },
              ].map((tab) => (
                <Button
                  key={tab.label}
                  size="sm"
                  variant="ghost"
                  className={`rounded-full px-4 ${tab.active ? "bg-white text-black" : "border border-transparent text-white/80 hover:border-white/20 hover:bg-white/5"}`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            <Badge className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">Updated feed</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 shadow-[0_12px_50px_rgba(0,0,0,0.25)] sm:px-6">
            <Badge className="rounded-full bg-white/15 px-3 py-1 text-white">PRO</Badge>
            <span className="flex-1 text-[13px] sm:text-sm">Upgrade for full access beyond the latest drops — stay ahead.</span>
            <Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90">
              Get Pro
            </Button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-3xl border border-white/10 bg-black/30 px-2 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:px-4 sm:py-6">
            <ShareListing posts={posts} />
          </div>
        </div>
      </div>
    </div>
  )
}
