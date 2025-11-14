"use client"

import * as React from "react"
import { Clock, LibraryBig, Search, Star, Tags } from "lucide-react"

import { ExploreView } from "@/components/app-sidebar/nav-views/explore-view"
import type { PendingFolderInput, PendingPatternInput } from "@/components/app-sidebar/folder-tree"
import { SidebarNavRail, NAV_RAIL_WIDTH, type NavItem } from "@/components/app-sidebar/nav-rail"
import { NavViewContainer } from "@/components/app-sidebar/nav-views/nav-view-container"
import { useSidebarResize } from "@/components/app-sidebar/use-sidebar-resize"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Folder, Pattern } from "@/lib/types"
import { storageService } from "@/lib/storage"
import { useStorageCollections } from "@/lib/use-storage-collections"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { NAVIGATE_NAV_EVENT, type NavigateNavDetail } from "@/lib/navigation-events"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: "explore",
    title: "EXPLORE",
    description: "",
    icon: LibraryBig,
  },
  {
    id: "search",
    title: "SEARCH",
    description: "",
    icon: Search,
  },
  {
    id: "recent-updates",
    title: "RECENT UPDATES",
    description: "",
    icon: Clock,
  },
  {
    id: "favorites",
    title: "FAVORITES",
    description: "",
    icon: Star,
  },
  {
    id: "tag-settings",
    title: "TAG SETTINGS",
    description: "",
    icon: Tags,
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
  const { folders, patterns } = useStorageCollections()
  const [pendingPatternInput, setPendingPatternInput] = React.useState<PendingPatternInput | null>(null)
  const [pendingFolderInput, setPendingFolderInput] = React.useState<PendingFolderInput | null>(null)
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [uiSelectedPatternId, setUiSelectedPatternId] = React.useState<string | null>(null)
  const [activeNavId, setActiveNavId] = React.useState(PRIMARY_NAV_ITEMS[0]?.id ?? "")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchSelectedTagIds, setSearchSelectedTagIds] = React.useState<string[]>([])
  const isSidebarCollapsed = sidebarState === "collapsed"

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

  const workspaceId = folders[0]?.workspaceId ?? "workspace-default"
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
    (patternId: string) => {
      storageService.patterns.remove(patternId)
      if (uiSelectedPatternId === patternId) {
        setUiSelectedPatternId(null)
        onPatternSelect?.()
      }
    },
    [onPatternSelect, uiSelectedPatternId]
  )

  const handleFolderDelete = React.useCallback(
    (folderId: string) => {
      const folderIds = collectFolderBranch(folderId)
      if (!folderIds.length) return
      const folderIdSet = new Set(folderIds)
      folderIds.forEach((id) => storageService.folders.remove(id))

      const affectedPatterns = patterns.filter((pattern) => {
        const folderId = pattern.folderId
        if (!folderId) return false
        return folderIdSet.has(folderId)
      })
      if (affectedPatterns.length) {
        const deletedPatternIds = new Set(affectedPatterns.map((pattern) => pattern.id))
        affectedPatterns.forEach((pattern) => storageService.patterns.remove(pattern.id))
        if (uiSelectedPatternId && deletedPatternIds.has(uiSelectedPatternId)) {
          setUiSelectedPatternId(null)
          onPatternSelect?.()
        }
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
    },
    [
      collectFolderBranch,
      onPatternSelect,
      patterns,
      pendingFolderInput,
      pendingPatternInput,
      selectedFolderId,
      uiSelectedPatternId,
    ]
  )

  const handlePatternMove = React.useCallback((patternId: string, destinationFolderId: string | null) => {
    storageService.patterns.update(patternId, (pattern) => ({
      ...pattern,
      folderId: destinationFolderId,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const handleFolderMove = React.useCallback(
    (folderId: string, destinationFolderId: string | null) => {
      const branch = new Set(collectFolderBranch(folderId))
      if (destinationFolderId && branch.has(destinationFolderId)) {
        return
      }
      storageService.folders.update(folderId, (folder) => {
        const parentFolder = destinationFolderId
          ? folders.find((item) => item.id === destinationFolderId)
          : undefined
        return {
          ...folder,
          parentId: destinationFolderId ?? undefined,
          workspaceId: parentFolder?.workspaceId ?? folder.workspaceId,
        }
      })
    },
    [collectFolderBranch, folders]
  )

  const handlePatternInputSubmit = React.useCallback(
    (rawName: string, folderId: string | null) => {
      const trimmed = rawName.trim()
      if (!trimmed) {
        setPendingPatternInput(null)
        return
      }
      const timestamp = new Date().toISOString()
      const pattern: Pattern = {
        id: createId(),
        folderId,
        name: trimmed,
        serviceName: trimmed,
        summary: "",
        tags: [],
        author: data.user.name,
        isFavorite: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        captureCount: 0,
      }
      storageService.patterns.create(pattern)
      setPendingPatternInput(null)
      handlePatternSelect(pattern.id)
    },
    [handlePatternSelect]
  )

  const handleFolderInputSubmit = React.useCallback(
    (rawName: string, parentId: string | null) => {
      const trimmed = rawName.trim()
      if (!trimmed) {
        setPendingFolderInput(null)
        return
      }
      const parentWorkspaceId = parentId
        ? folders.find((folder) => folder.id === parentId)?.workspaceId
        : undefined
      const folder: Folder = {
        id: createId(),
        workspaceId: parentWorkspaceId ?? workspaceId,
        name: trimmed,
        parentId: parentId ?? undefined,
        createdAt: new Date().toISOString(),
      }
      storageService.folders.create(folder)
      setPendingFolderInput(null)
      handleFolderSelect(folder.id)
    },
    [folders, workspaceId, handleFolderSelect]
  )

  const mergedClassName = React.useMemo(
    () => cn("overflow-hidden *:data-[sidebar=sidebar]:flex-row", className),
    [className]
  )

  const exploreView = (
    <ExploreView
      title="내 아카이브"
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
        onBackgroundClick: handleTreeBackgroundClick,
        onBackgroundContextMenu: handleTreeBackgroundContextMenu,
        onRootPatternClick: () => openPatternInput(null),
        onRootFolderClick: () => openFolderInput(null),
        clearSelection,
      }}
    />
  )

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
            {activeNavItem && (
              <div className="flex flex-col gap-1 text-left">
                <span className="text-base font-medium text-foreground">{activeNavItem.title}</span>
                {activeNavItem.description && (
                  <span className="text-xs text-muted-foreground">{activeNavItem.description}</span>
                )}
              </div>
            )}
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
            />
          </SidebarContent>
        </div>
      </Sidebar>
      {!isSidebarCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="사이드바 너비 조절"
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
