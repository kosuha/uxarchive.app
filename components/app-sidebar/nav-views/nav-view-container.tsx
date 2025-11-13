"use client"

import type { ReactNode } from "react"

import { Compass } from "lucide-react"

import { EmptyPlaceholder } from "@/components/app-sidebar/nav-views/empty-placeholder"
import { FavoritesView } from "@/components/app-sidebar/nav-views/favorites-view"
import { RecentUpdatesView } from "@/components/app-sidebar/nav-views/recent-updates-view"
import { SearchView, type SearchViewProps } from "@/components/app-sidebar/nav-views/search-view"
import { TagSettingsView } from "@/components/app-sidebar/nav-views/tag-settings-view"

type NavViewContainerProps = {
  activeNavId: string
  exploreView: ReactNode
  searchViewProps: SearchViewProps
}

const NAV_VIEW_COMPONENTS: Record<string, React.ComponentType | undefined> = {
  "recent-updates": RecentUpdatesView,
  favorites: FavoritesView,
  "tag-settings": TagSettingsView,
}

export function NavViewContainer({ activeNavId, exploreView, searchViewProps }: NavViewContainerProps) {
  if (activeNavId === "explore") {
    return <>{exploreView}</>
  }

  if (activeNavId === "search") {
    return <SearchView {...searchViewProps} />
  }

  const ViewComponent = NAV_VIEW_COMPONENTS[activeNavId]
  if (ViewComponent) {
    return <ViewComponent />
  }

  return (
    <EmptyPlaceholder
      icon={Compass}
      title="새로운 뷰를 구성할 준비가 되어 있습니다"
      description="Nav id와 매핑되는 뷰 컴포넌트를 추가하면 이 영역에 바로 표시됩니다."
    />
  )
}
