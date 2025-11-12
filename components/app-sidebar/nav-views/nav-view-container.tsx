"use client"

import type { ReactNode } from "react"

import { Compass } from "lucide-react"

import { EmptyPlaceholder } from "@/components/app-sidebar/nav-views/empty-placeholder"
import { FavoritesView } from "@/components/app-sidebar/nav-views/favorites-view"
import { RecentUpdatesView } from "@/components/app-sidebar/nav-views/recent-updates-view"
import { SearchView } from "@/components/app-sidebar/nav-views/search-view"

type NavViewContainerProps = {
  activeNavId: string
  exploreView: ReactNode
}

const NAV_VIEW_COMPONENTS: Record<string, React.ComponentType | undefined> = {
  search: SearchView,
  "recent-updates": RecentUpdatesView,
  favorites: FavoritesView,
}

export function NavViewContainer({ activeNavId, exploreView }: NavViewContainerProps) {
  if (activeNavId === "explore") {
    return <>{exploreView}</>
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
