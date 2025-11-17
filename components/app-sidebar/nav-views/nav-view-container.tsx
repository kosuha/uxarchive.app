"use client"

import type { ReactNode } from "react"

import { Compass } from "lucide-react"

import { EmptyPlaceholder } from "@/components/app-sidebar/nav-views/empty-placeholder"
import { FavoritesView, type FavoritesViewProps } from "@/components/app-sidebar/nav-views/favorites-view"
import { RecentUpdatesView } from "@/components/app-sidebar/nav-views/recent-updates-view"
import { SearchView, type SearchViewProps } from "@/components/app-sidebar/nav-views/search-view"
import { TagSettingsView } from "@/components/app-sidebar/nav-views/tag-settings-view"

type NavViewContainerProps = {
  activeNavId: string
  exploreView: ReactNode
  searchViewProps: SearchViewProps
  favoritesViewProps: FavoritesViewProps
}

const STATIC_NAV_VIEW_COMPONENTS: Record<string, React.ComponentType | undefined> = {
  "recent-updates": RecentUpdatesView,
  "tag-settings": TagSettingsView,
}

export function NavViewContainer({ activeNavId, exploreView, searchViewProps, favoritesViewProps }: NavViewContainerProps) {
  if (activeNavId === "explore") {
    return <>{exploreView}</>
  }

  if (activeNavId === "search") {
    return <SearchView {...searchViewProps} />
  }

  if (activeNavId === "favorites") {
    return <FavoritesView {...favoritesViewProps} />
  }

  const ViewComponent = STATIC_NAV_VIEW_COMPONENTS[activeNavId]
  if (ViewComponent) {
    return <ViewComponent />
  }

  return (
    <EmptyPlaceholder
      icon={Compass}
      title="Ready to add a new view"
      description="Add a view component mapped to the nav id to display it here."
    />
  )
}
