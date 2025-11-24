"use client"

import * as React from "react"
import { File, Search, Star } from "lucide-react"

import { ExploreView } from "@/components/app-sidebar/nav-views/explore-view"
import type { PendingFolderInput, PendingPatternInput } from "@/components/app-sidebar/folder-tree"
import { SidebarNavRail, NAV_RAIL_WIDTH, type NavItem } from "@/components/app-sidebar/nav-rail"
import { NavViewContainer } from "@/components/app-sidebar/nav-views/nav-view-container"
import { SyncStatusIndicator } from "@/components/app-sidebar/sync-status-indicator"
import { useSidebarResize } from "@/components/app-sidebar/use-sidebar-resize"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { useWorkspaceData } from "@/lib/workspace-data-context"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { NAVIGATE_NAV_EVENT, type NavigateNavDetail } from "@/lib/navigation-events"

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
  {
    id: "favorites",
    title: "FAVORITES",
    description: "",
    icon: Star,
  },
]

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  selectedPatternId?: string
  onPatternSelect?: (patternId?: string) => void
}

export function AppSidebar({
  selectedPatternId,
  onPatternSelect,
  style: incomingStyle,
  side: sideProp = "left",
  className,
  ...props
}: AppSidebarProps) {
  const isMobile = useIsMobile()
  const { state: sidebarState } = useSidebar()
  const { folders, patterns, loading, error, mutations } = useWorkspaceData()
  const [pendingPatternInput, setPendingPatternInput] = React.useState<PendingPatternInput | null>(null)
  const [pendingFolderInput, setPendingFolderInput] = React.useState<PendingFolderInput | null>(null)
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [uiSelectedPatternId, setUiSelectedPatternId] = React.useState<string | null>(null)
  const [activeNavId, setActiveNavId] = React.useState(PRIMARY_NAV_ITEMS[0]?.id ?? "")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchSelectedTagIds, setSearchSelectedTagIds] = React.useState<string[]>([])
  // 모바일 시트에서는 접힘 상태를 적용하지 않아야 내용이 보인다.
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

  const uiInteractionPattern = React.useMemo(() => {
    if (!uiSelectedPatternId) return null
    return patterns.find((pattern) => pattern.id === uiSelectedPatternId) ?? null
  }, [patterns, uiSelectedPatternId])
  const resolvedSelectedPatternId = uiSelectedPatternId ?? selectedPatternId ?? null
  const selectedPattern = React.useMemo(() => {
    if (!resolvedSelectedPatternId) return null
    return patterns.find((pattern) => pattern.id === resolvedSelectedPatternId) ?? null
  }, [patterns, resolvedSelectedPatternId])
  const interactionSelectedPattern = uiInteractionPattern ?? selectedPattern ?? null
  const interactionSelectedFolderId = interactionSelectedPattern?.folderId ?? null
  const canCreatePattern = true
  const activeNavItem = React.useMemo(() => {
    return PRIMARY_NAV_ITEMS.find((item) => item.id === activeNavId) ?? PRIMARY_NAV_ITEMS[0]
  }, [activeNavId])
  const resolvedActiveNavId = activeNavItem?.id ?? PRIMARY_NAV_ITEMS[0]?.id ?? "explore"

  React.useEffect(() => {
    if (selectedFolderId && !folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(null)
    }
  }, [selectedFolderId, folders])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handleNavEvent = (event: Event) => {
      const detail = (event as CustomEvent<NavigateNavDetail>).detail
      const nextNavId = detail?.navId
      if (!nextNavId) return
      const exists = PRIMARY_NAV_ITEMS.some((item) => item.id === nextNavId)
      if (!exists) return
      setActiveNavId(nextNavId)
    }

    window.addEventListener(NAVIGATE_NAV_EVENT, handleNavEvent as EventListener)
    return () => window.removeEventListener(NAVIGATE_NAV_EVENT, handleNavEvent as EventListener)
  }, [])

  React.useEffect(() => {
    if (
      pendingPatternInput &&
      pendingPatternInput.folderId &&
      !folders.some((folder) => folder.id === pendingPatternInput.folderId)
    ) {
      setPendingPatternInput(null)
    }
  }, [pendingPatternInput, folders])

  React.useEffect(() => {
    if (
      pendingFolderInput &&
      pendingFolderInput.parentId &&
      !folders.some((folder) => folder.id === pendingFolderInput.parentId)
    ) {
      setPendingFolderInput(null)
    }
  }, [pendingFolderInput, folders])

  const beginPatternCreation = React.useCallback((folderId: string | null) => {
    setPendingFolderInput(null)
    setPendingPatternInput({ folderId, token: createId() })
    if (folderId) {
      setSelectedFolderId(folderId)
    } else {
      setSelectedFolderId(null)
    }
  }, [])

  const beginFolderCreation = React.useCallback((parentId: string | null) => {
    setPendingPatternInput(null)
    setPendingFolderInput({ parentId: parentId ?? null, token: createId() })
    if (parentId) {
      setSelectedFolderId(parentId)
    }
  }, [])

  const openPatternInput = React.useCallback(
    (targetFolderId?: string | null) => {
      if (!canCreatePattern) return
      if (typeof targetFolderId === "undefined") {
        beginPatternCreation(selectedFolderId ?? interactionSelectedFolderId ?? null)
        return
      }
      beginPatternCreation(targetFolderId)
    },
    [beginPatternCreation, canCreatePattern, interactionSelectedFolderId, selectedFolderId]
  )

  const openFolderInput = React.useCallback(
    (parentId?: string | null) => {
      if (typeof parentId === "undefined") {
        beginFolderCreation(selectedFolderId ?? interactionSelectedFolderId ?? null)
        return
      }
      beginFolderCreation(parentId)
    },
    [beginFolderCreation, interactionSelectedFolderId, selectedFolderId]
  )

  const handlePatternSelect = React.useCallback(
    (patternId: string) => {
      setSelectedFolderId(null)
      setUiSelectedPatternId(patternId)
      onPatternSelect?.(patternId)
    },
    [onPatternSelect]
  )

  const handleFolderSelect = React.useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId)
    if (folderId) {
      setUiSelectedPatternId(null)
    }
  }, [])

  const clearSelection = React.useCallback(() => {
    setSelectedFolderId(null)
    setUiSelectedPatternId(null)
  }, [])

  const handleNavItemSelect = React.useCallback(
    (itemId: string) => {
      setActiveNavId(itemId)
      clearSelection()
    },
    [clearSelection]
  )

  const handleTreeBackgroundClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-tree-interactive="true"]')) {
        clearSelection()
      }
    },
    [clearSelection]
  )

  const handleTreeBackgroundContextMenu = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-tree-interactive="true"]')) {
        clearSelection()
      }
    },
    [clearSelection]
  )

  const collectFolderBranch = React.useCallback(
    (rootId: string) => {
      const queue = [rootId]
      const collected: string[] = []
      while (queue.length) {
        const current = queue.shift()
        if (!current) continue
        collected.push(current)
        folders.forEach((folder) => {
          if (folder.parentId === current) {
            queue.push(folder.id)
          }
        })
      }
      return collected
    },
    [folders]
  )

  const handlePatternDelete = React.useCallback(
    async (patternId: string) => {
      try {
        await mutations.deletePattern(patternId)
        if (uiSelectedPatternId === patternId) {
          setUiSelectedPatternId(null)
          onPatternSelect?.()
        }
      } catch (mutationError) {
        console.error("Failed to delete pattern", mutationError)
      }
    },
    [mutations, onPatternSelect, uiSelectedPatternId]
  )

  const handleFolderDelete = React.useCallback(
    async (folderId: string) => {
      const folderIds = collectFolderBranch(folderId)
      if (!folderIds.length) return
      const folderIdSet = new Set(folderIds)
      const affectedPatterns = patterns.filter((pattern) => pattern.folderId && folderIdSet.has(pattern.folderId))

      try {
        for (const pattern of affectedPatterns) {
          await mutations.deletePattern(pattern.id)
        }
        for (const branchId of [...folderIds].reverse()) {
          await mutations.deleteFolder(branchId)
        }

        if (selectedFolderId && folderIdSet.has(selectedFolderId)) {
          setSelectedFolderId(null)
        }
        if (
          pendingPatternInput &&
          pendingPatternInput.folderId &&
          folderIdSet.has(pendingPatternInput.folderId)
        ) {
          setPendingPatternInput(null)
        }
        if (
          pendingFolderInput &&
          pendingFolderInput.parentId &&
          folderIdSet.has(pendingFolderInput.parentId)
        ) {
          setPendingFolderInput(null)
        }
      } catch (mutationError) {
        console.error("Failed to delete folder", mutationError)
      }
    },
    [collectFolderBranch, mutations, patterns, pendingFolderInput, pendingPatternInput, selectedFolderId]
  )

  const handlePatternMove = React.useCallback(
    async (patternId: string, destinationFolderId: string | null) => {
      try {
        await mutations.updatePattern(patternId, { folderId: destinationFolderId })
      } catch (mutationError) {
        console.error("Failed to move pattern", mutationError)
      }
    },
    [mutations]
  )

  const handleFolderMove = React.useCallback(
    async (folderId: string, destinationFolderId: string | null) => {
      const branch = new Set(collectFolderBranch(folderId))
      if (destinationFolderId && branch.has(destinationFolderId)) {
        return
      }
      try {
        await mutations.updateFolder(folderId, { parentId: destinationFolderId ?? null })
      } catch (mutationError) {
        console.error("Failed to move folder", mutationError)
      }
    },
    [collectFolderBranch, mutations]
  )

  const handleFolderRename = React.useCallback(
    async (folderId: string, rawName: string) => {
      const trimmed = rawName.trim()
      if (!trimmed) return
      try {
        await mutations.updateFolder(folderId, { name: trimmed })
      } catch (mutationError) {
        console.error("Failed to rename folder", mutationError)
      }
    },
    [mutations]
  )

  const handlePatternInputSubmit = React.useCallback(
    async (rawName: string, folderId: string | null) => {
      const trimmed = rawName.trim()
      if (!trimmed) {
        setPendingPatternInput(null)
        return
      }
      try {
        // 인풋은 즉시 닫아서 사용자에게 잔존 입력창이 보이지 않도록 처리
        setPendingPatternInput(null)
        await mutations.createPattern({ name: trimmed, folderId })
      } catch (mutationError) {
        console.error("Failed to create pattern", mutationError)
      }
    },
    [mutations]
  )

  const handleFolderInputSubmit = React.useCallback(
    async (rawName: string, parentId: string | null) => {
      const trimmed = rawName.trim()
      if (!trimmed) {
        setPendingFolderInput(null)
        return
      }
      try {
        // 폴더 생성도 엔터 입력 후 즉시 인풋을 숨겨 UX 지연을 제거
        setPendingFolderInput(null)
        await mutations.createFolder({ name: trimmed, parentId })
      } catch (mutationError) {
        console.error("Failed to create folder", mutationError)
      }
    },
    [mutations]
  )

  const mergedClassName = React.useMemo(
    () => cn("overflow-hidden *:data-[sidebar=sidebar]:flex-row", className),
    [className]
  )

  const exploreView = (
    <ExploreView
      title="My Archive"
      state={{
        folders,
        patterns,
        selectedPatternId: uiSelectedPatternId,
        selectedFolderId,
        pendingPatternInput,
        pendingFolderInput,
      }}
      handlers={{
        onPatternSelect: handlePatternSelect,
        onFolderSelect: handleFolderSelect,
        onPatternInputSubmit: handlePatternInputSubmit,
        onFolderInputSubmit: handleFolderInputSubmit,
        onPatternInputCancel: () => setPendingPatternInput(null),
        onFolderInputCancel: () => setPendingFolderInput(null),
        onPatternCreateRequest: beginPatternCreation,
        onFolderCreateRequest: beginFolderCreation,
        onPatternDelete: handlePatternDelete,
        onFolderDelete: handleFolderDelete,
        onPatternMove: handlePatternMove,
        onFolderMove: handleFolderMove,
        onFolderRename: handleFolderRename,
        onBackgroundClick: handleTreeBackgroundClick,
        onBackgroundContextMenu: handleTreeBackgroundContextMenu,
        onRootPatternClick: () => openPatternInput(null),
        onRootFolderClick: () => openFolderInput(null),
        clearSelection,
      }}
    />
  )

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading workspace...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <>
      {!isMobile && (
        <SidebarNavRail
          items={PRIMARY_NAV_ITEMS}
          activeNavId={activeNavId}
          onNavItemSelect={handleNavItemSelect}
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
              <SyncStatusIndicator />
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-1 flex-col">
            <NavViewContainer
              activeNavId={resolvedActiveNavId}
              exploreView={exploreView}
              searchViewProps={{
                onPatternSelect: handlePatternSelect,
                query: searchQuery,
                setQuery: setSearchQuery,
                selectedTagIds: searchSelectedTagIds,
                setSelectedTagIds: setSearchSelectedTagIds,
              }}
              favoritesViewProps={{
                onPatternSelect: handlePatternSelect,
              }}
            />
          </SidebarContent>
        </div>
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
