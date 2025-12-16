"use client"

import * as React from "react"
import { File, Search, Star } from "lucide-react"

import { RepositoryExploreView } from "@/components/app-sidebar/nav-views/repository-explore-view"
import { NavRailButton, SidebarNavRail, NAV_RAIL_WIDTH, type NavItem } from "@/components/app-sidebar/nav-rail"
import { NavViewContainer } from "@/components/app-sidebar/nav-views/nav-view-container"
import { SyncStatusIndicator } from "@/components/app-sidebar/sync-status-indicator"
import { useSidebarResize } from "@/components/app-sidebar/use-sidebar-resize"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
// import { useIsMobile } from "@/hooks/use-mobile" // Assuming hook exists

const PRIMARY_NAV_ITEMS: NavItem[] = [
    {
        id: "explore",
        title: "EXPLORE",
        description: "",
        icon: File,
    },
    {
        id: "search",
        title: "SEARCH",
        description: "",
        icon: Search,
    },
    //   {
    //     id: "favorites",
    //     title: "FAVORITES",
    //     description: "",
    //     icon: Star,
    //   },
]

export function RepositoryAppSidebar({
    style: incomingStyle,
    side: sideProp = "left",
    className,
    ...props
}: React.ComponentProps<typeof Sidebar>) {
    // Mock isMobile for now or import if valid
    const isMobile = false
    const { state: sidebarState } = useSidebar()
    const [activeNavId, setActiveNavId] = React.useState(PRIMARY_NAV_ITEMS[0]?.id ?? "")

    const [searchQuery, setSearchQuery] = React.useState("")
    
    const isSidebarCollapsed = !isMobile && sidebarState === "collapsed"

    const navOffsetValue = React.useMemo(
        () => (isMobile ? "0px" : NAV_RAIL_WIDTH),
        [isMobile]
    )
    const { sidebarStyle, isResizing, resizerStyle, handleRef, handleResizeStart } = useSidebarResize({
        side: sideProp,
        incomingStyle,
        isMobile,
        isCollapsed: isSidebarCollapsed,
        navOffsetValue,
    })

    const activeNavItem = React.useMemo(() => {
        return PRIMARY_NAV_ITEMS.find((item) => item.id === activeNavId) ?? PRIMARY_NAV_ITEMS[0]
    }, [activeNavId])

    const mergedClassName = React.useMemo(
        () => cn("overflow-hidden *:data-[sidebar=sidebar]:flex-row", className),
        [className]
    )

    return (
        <>
            {!isMobile && (
                <SidebarNavRail
                    items={PRIMARY_NAV_ITEMS}
                    activeNavId={activeNavId}
                    onNavItemSelect={setActiveNavId}
                />
            )}
            <Sidebar
                variant="inset"
                collapsible="icon"
                side={sideProp}
                style={sidebarStyle}
                data-resizing={isResizing ? "true" : undefined}
                className={mergedClassName}
                offset={isMobile ? 0 : "var(--nav-rail-width)"}
                {...props}
            >
                <div
                    className={cn(
                        "flex min-h-0 flex-1 flex-col transition-opacity duration-200",
                        isSidebarCollapsed && "pointer-events-none opacity-0"
                    )}
                    aria-hidden={isSidebarCollapsed}
                >
                    <SidebarHeader className="gap-3.5 border-b border-border/60 p-4">
                        <div className="flex flex-col gap-3 text-left">
                            {activeNavItem && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-base font-black text-foreground">{activeNavItem.title}</span>
                                    {activeNavItem.description && (
                                        <span className="text-xs text-muted-foreground">{activeNavItem.description}</span>
                                    )}
                                </div>
                            )}
                            {/* <SyncStatusIndicator /> */}
                        </div>
                    </SidebarHeader>
                    <SidebarContent className="flex flex-1 flex-col">
                        <NavViewContainer
                            activeNavId={activeNavId}
                            exploreView={<RepositoryExploreView />}
                            searchViewProps={{
                                query: searchQuery,
                                setQuery: setSearchQuery,
                            }}
                            favoritesViewProps={null as any}
                        />
                    </SidebarContent>
                </div>
                {isMobile && (
                    <div className="rounded-b-xl border-t border-border/60 p-1 md:hidden hover:bg-sidebar-accent">
                        <NavUser showUserInfo />
                    </div>
                )}
            </Sidebar>
            {!isSidebarCollapsed && (
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize sidebar"
                    className={cn(
                        "fixed inset-y-0 z-30 hidden cursor-col-resize touch-none md:block",
                        "transition-colors",
                        isResizing ? "bg-primary/20" : "bg-transparent hover:bg-primary/10"
                    )}
                    ref={handleRef}
                    style={resizerStyle}
                    onPointerDown={handleResizeStart}
                    data-sidebar-resizer="true"
                />
            )}
        </>
    )
}
