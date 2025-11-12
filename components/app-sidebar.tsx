"use client"

import * as React from "react"
import {
  ChevronDown,
  Clock,
  Command,
  FilePlus,
  Folder as FolderIcon,
  FolderPlus,
  Star,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { Folder, Pattern } from "@/lib/types"
import { storageService } from "@/lib/storage"
import { useStorageCollections } from "@/lib/use-storage-collections"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  }
}

type NavItem = {
  id: string
  title: string
  description?: string
  icon: LucideIcon
}

type NavRailButtonProps = {
  item: NavItem
  isActive: boolean
  onSelect: () => void
  isCollapsed?: boolean
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: "my-archive",
    title: "내 아카이브",
    description: "저장한 패턴과 폴더 전체",
    icon: FolderIcon,
  },
  {
    id: "recent-updates",
    title: "최근 업데이트",
    description: "최근 수정한 패턴을 빠르게 살펴봅니다.",
    icon: Clock,
  },
  {
    id: "favorites",
    title: "즐겨찾기",
    description: "핵심 패턴만 집중해서 확인하세요.",
    icon: Star,
  },
]

function NavRailButton({ item, isActive, onSelect, isCollapsed }: NavRailButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={item.title}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
        "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="size-4" />
    </button>
  )
}


type FolderTreeNode = {
  folder: Folder
  patterns: Pattern[]
  children: FolderTreeNode[]
}

type PendingPatternInput = {
  folderId: string | null
  token: string
}

type PendingFolderInput = {
  parentId: string | null
  token: string
}

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const SIDEBAR_MIN_WIDTH = 240
const SIDEBAR_MAX_WIDTH = 480
const SIDEBAR_DEFAULT_WIDTH = 320
const RESIZE_HANDLE_WIDTH = 8
const LIVE_WIDTH_CSS_VAR = "--app-sidebar-live-width"
const NAV_RAIL_WIDTH = "calc(var(--sidebar-width-icon) + 1px)"

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

const buildFolderTree = (folders: Folder[], patterns: Pattern[]): FolderTreeNode[] => {
  const nodeMap = new Map<string, FolderTreeNode>()

  folders.forEach((folder) => {
    nodeMap.set(folder.id, {
      folder,
      patterns: [],
      children: [],
    })
  })

  patterns.forEach((pattern) => {
    if (!pattern.folderId) return
    const node = nodeMap.get(pattern.folderId)
    if (node) {
      node.patterns.push(pattern)
    }
  })

  const roots: FolderTreeNode[] = []

  nodeMap.forEach((node) => {
    const parentId = node.folder.parentId
    if (parentId) {
      const parentNode = nodeMap.get(parentId)
      if (parentNode) {
        parentNode.children.push(node)
        return
      }
    }
    roots.push(node)
  })

  return roots
}

const getPatternCount = (node: FolderTreeNode): number => {
  return (
    node.patterns.length +
    node.children.reduce((total, child) => total + getPatternCount(child), 0)
  )
}

const nodeContainsFolder = (node: FolderTreeNode, folderId: string): boolean => {
  if (node.folder.id === folderId) {
    return true
  }
  return node.children.some((child) => nodeContainsFolder(child, folderId))
}

const nodeContainsPattern = (node: FolderTreeNode, patternId: string): boolean => {
  if (node.patterns.some((pattern) => pattern.id === patternId)) {
    return true
  }
  return node.children.some((child) => nodeContainsPattern(child, patternId))
}

function FolderTree({
  folders,
  patterns,
  selectedPatternId,
  onPatternSelect,
  pendingPatternInput,
  pendingFolderInput,
  onPatternInputSubmit,
  onPatternInputCancel,
  onFolderInputSubmit,
  onFolderInputCancel,
  selectedFolderId,
  onFolderSelect,
  onPatternCreateRequest,
  onFolderCreateRequest,
  onPatternDelete,
  onFolderDelete,
}: {
  folders: Folder[]
  patterns: Pattern[]
  selectedPatternId?: string
  onPatternSelect?: (patternId?: string) => void
  pendingPatternInput?: PendingPatternInput | null
  pendingFolderInput?: PendingFolderInput | null
  onPatternInputSubmit?: (name: string, folderId: string | null) => void
  onPatternInputCancel?: () => void
  onFolderInputSubmit?: (name: string, parentId: string | null) => void
  onFolderInputCancel?: () => void
  selectedFolderId?: string | null
  onFolderSelect?: (folderId: string | null) => void
  onPatternCreateRequest?: (folderId: string | null) => void
  onFolderCreateRequest?: (parentId: string | null) => void
  onPatternDelete?: (patternId: string) => void
  onFolderDelete?: (folderId: string) => void
}) {
  const tree = React.useMemo(() => buildFolderTree(folders, patterns), [folders, patterns])
  const rootPatterns = React.useMemo(
    () => patterns.filter((pattern) => !pattern.folderId || !folders.some((folder) => folder.id === pattern.folderId)),
    [folders, patterns]
  )
  const shouldShowRootPatterns = rootPatterns.length > 0 || pendingPatternInput?.folderId === null
  const shouldShowRootFolders = tree.length > 0 || pendingFolderInput?.parentId === null

  if (!tree.length && !pendingFolderInput && !shouldShowRootPatterns) {
    return (
      <div className="text-sidebar-foreground/70 rounded-md border border-dashed border-border/60 px-3 py-4 text-xs">
        폴더 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {shouldShowRootFolders && (
        <FolderMenuList
          nodes={tree}
          parentId={null}
          selectedPatternId={selectedPatternId}
          onPatternSelect={onPatternSelect}
          pendingPatternInput={pendingPatternInput}
          pendingFolderInput={pendingFolderInput}
          onPatternInputSubmit={onPatternInputSubmit}
          onPatternInputCancel={onPatternInputCancel}
          onFolderInputSubmit={onFolderInputSubmit}
          onFolderInputCancel={onFolderInputCancel}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onPatternCreateRequest={onPatternCreateRequest}
          onFolderCreateRequest={onFolderCreateRequest}
          onPatternDelete={onPatternDelete}
          onFolderDelete={onFolderDelete}
        />
      )}
      {shouldShowRootPatterns && (
        <PatternList
          folderId={null}
          patterns={rootPatterns}
          showEmpty
          nested={false}
          selectedPatternId={selectedPatternId}
          onPatternSelect={onPatternSelect}
          pendingPatternInput={pendingPatternInput}
          onPatternInputSubmit={onPatternInputSubmit}
          onPatternInputCancel={onPatternInputCancel}
          onPatternCreateRequest={onPatternCreateRequest}
          onPatternDelete={onPatternDelete}
          onFolderCreateRequest={onFolderCreateRequest}
        />
      )}
    </div>
  )
}

function FolderMenuList({
  nodes,
  parentId = null,
  nested = false,
  selectedPatternId,
  onPatternSelect,
  pendingPatternInput,
  pendingFolderInput,
  onPatternInputSubmit,
  onPatternInputCancel,
  onFolderInputSubmit,
  onFolderInputCancel,
  selectedFolderId,
  onFolderSelect,
  onPatternCreateRequest,
  onFolderCreateRequest,
  onPatternDelete,
  onFolderDelete,
}: {
  nodes: FolderTreeNode[]
  parentId?: string | null
  nested?: boolean
  selectedPatternId?: string
  onPatternSelect?: (patternId?: string) => void
  pendingPatternInput?: PendingPatternInput | null
  pendingFolderInput?: PendingFolderInput | null
  onPatternInputSubmit?: (name: string, folderId: string | null) => void
  onPatternInputCancel?: () => void
  onFolderInputSubmit?: (name: string, parentId: string | null) => void
  onFolderInputCancel?: () => void
  selectedFolderId?: string | null
  onFolderSelect?: (folderId: string | null) => void
  onPatternCreateRequest?: (folderId: string | null) => void
  onFolderCreateRequest?: (parentId: string | null) => void
  onPatternDelete?: (patternId: string) => void
  onFolderDelete?: (folderId: string) => void
}) {
  const showFolderInput =
    pendingFolderInput && pendingFolderInput.parentId === (parentId ?? null)

  return (
    <SidebarMenu className={nested ? "gap-1" : undefined}>
      {nodes.map((node) => (
        <SidebarMenuItem key={node.folder.id} className="px-0">
          <FolderNodeItem
            node={node}
            selectedPatternId={selectedPatternId}
            onPatternSelect={onPatternSelect}
            pendingPatternInput={pendingPatternInput}
            pendingFolderInput={pendingFolderInput}
            onPatternInputSubmit={onPatternInputSubmit}
            onPatternInputCancel={onPatternInputCancel}
            onFolderInputSubmit={onFolderInputSubmit}
            onFolderInputCancel={onFolderInputCancel}
            selectedFolderId={selectedFolderId}
            onFolderSelect={onFolderSelect}
            onPatternCreateRequest={onPatternCreateRequest}
            onFolderCreateRequest={onFolderCreateRequest}
            onPatternDelete={onPatternDelete}
            onFolderDelete={onFolderDelete}
          />
        </SidebarMenuItem>
      ))}
      {showFolderInput && pendingFolderInput && (
        <SidebarMenuItem
          key={`folder-input-${pendingFolderInput.token}`}
          className="px-0"
        >
          <SidebarMenuButton
            asChild
            className="cursor-text"
            data-tree-interactive="true"
          >
            <div className="flex w-full items-center gap-2">
              <ChevronDown className="size-3.5 text-muted-foreground opacity-0" />
              <FolderIcon className="size-4 text-muted-foreground" />
              <InlineCreateInput
                placeholder="새 폴더 이름"
                onSubmit={(value) => onFolderInputSubmit?.(value, parentId ?? null)}
                onCancel={onFolderInputCancel ?? (() => {})}
                className="px-0"
              />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  )
}

function FolderNodeItem({
  node,
  selectedPatternId,
  onPatternSelect,
  pendingPatternInput,
  pendingFolderInput,
  onPatternInputSubmit,
  onPatternInputCancel,
  onFolderInputSubmit,
  onFolderInputCancel,
  selectedFolderId,
  onFolderSelect,
  onPatternCreateRequest,
  onFolderCreateRequest,
  onPatternDelete,
  onFolderDelete,
}: {
  node: FolderTreeNode
  selectedPatternId?: string
  onPatternSelect?: (patternId?: string) => void
  pendingPatternInput?: PendingPatternInput | null
  pendingFolderInput?: PendingFolderInput | null
  onPatternInputSubmit?: (name: string, folderId: string | null) => void
  onPatternInputCancel?: () => void
  onFolderInputSubmit?: (name: string, parentId: string | null) => void
  onFolderInputCancel?: () => void
  selectedFolderId?: string | null
  onFolderSelect?: (folderId: string | null) => void
  onPatternCreateRequest?: (folderId: string | null) => void
  onFolderCreateRequest?: (parentId: string | null) => void
  onPatternDelete?: (patternId: string) => void
  onFolderDelete?: (folderId: string) => void
}) {
  const hasChildren = node.children.length > 0
  const shouldShowChildFolderInput = pendingFolderInput?.parentId === node.folder.id
  const shouldRenderChildList = hasChildren || shouldShowChildFolderInput
  const totalPatterns = getPatternCount(node)
  const isSelected = node.folder.id === selectedFolderId
  const [isOpen, setIsOpen] = React.useState(() => {
    if (pendingFolderInput?.parentId && nodeContainsFolder(node, pendingFolderInput.parentId)) {
      return true
    }
    if (pendingPatternInput?.folderId && nodeContainsFolder(node, pendingPatternInput.folderId)) {
      return true
    }
    if (selectedFolderId && nodeContainsFolder(node, selectedFolderId)) {
      return true
    }
    if (selectedPatternId && nodeContainsPattern(node, selectedPatternId)) {
      return true
    }
    return false
  })
  const isOpenRef = React.useRef(isOpen)

  React.useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  React.useEffect(() => {
    const parentId = pendingFolderInput?.parentId
    if (!parentId) return
    if (!isOpenRef.current && nodeContainsFolder(node, parentId)) {
      setIsOpen(true)
    }
  }, [node, pendingFolderInput])

  React.useEffect(() => {
    const folderId = pendingPatternInput?.folderId
    if (!folderId) return
    if (!isOpenRef.current && nodeContainsFolder(node, folderId)) {
      setIsOpen(true)
    }
  }, [node, pendingPatternInput])

  React.useEffect(() => {
    if (isOpenRef.current) return
    if (
      selectedFolderId &&
      selectedFolderId !== node.folder.id &&
      nodeContainsFolder(node, selectedFolderId)
    ) {
      setIsOpen(true)
      return
    }
    if (selectedPatternId && nodeContainsPattern(node, selectedPatternId)) {
      setIsOpen(true)
    }
  }, [node, selectedFolderId, selectedPatternId])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              data-tree-interactive="true"
              className={cn(
                "justify-between",
                isSelected && "text-primary bg-primary/10 ring-1 ring-primary/40"
              )}
              onClick={() => onFolderSelect?.(node.folder.id)}
              onPointerDown={(event) => {
                if (event.button === 2) {
                  onFolderSelect?.(node.folder.id)
                }
              }}
              onContextMenu={() => onFolderSelect?.(node.folder.id)}
            >
              <span className="flex flex-1 items-center gap-2">
                <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                <FolderIcon className="size-4 text-muted-foreground" />
                <span className="truncate font-medium">{node.folder.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">{totalPatterns}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </ContextMenuTrigger>
        <ContextMenuContent
          align="start"
          className="w-44"
          onCloseAutoFocus={(event) => event.preventDefault()} // 새 입력창 포커스 유지
        >
          <ContextMenuItem onSelect={() => onPatternCreateRequest?.(node.folder.id)}>
            새 패턴
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => onFolderCreateRequest?.(node.folder.id)}
          >
            새 폴더
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onFolderDelete?.(node.folder.id)}
          >
            삭제
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <CollapsibleContent>
        <div className="relative mt-1 pl-5 before:absolute before:left-3.5 before:top-0 before:bottom-0 before:w-px before:bg-border">
          {shouldRenderChildList && (
            <FolderMenuList
              nodes={node.children}
              nested
              parentId={node.folder.id}
              selectedPatternId={selectedPatternId}
              onPatternSelect={onPatternSelect}
              pendingPatternInput={pendingPatternInput}
              pendingFolderInput={pendingFolderInput}
              onPatternInputSubmit={onPatternInputSubmit}
              onPatternInputCancel={onPatternInputCancel}
              onFolderInputSubmit={onFolderInputSubmit}
              onFolderInputCancel={onFolderInputCancel}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              onPatternCreateRequest={onPatternCreateRequest}
              onFolderCreateRequest={onFolderCreateRequest}
              onPatternDelete={onPatternDelete}
              onFolderDelete={onFolderDelete}
            />
          )}
          <PatternList
            folderId={node.folder.id}
            patterns={node.patterns}
            showEmpty={!hasChildren}
            selectedPatternId={selectedPatternId}
            onPatternSelect={onPatternSelect}
            pendingPatternInput={pendingPatternInput}
            onPatternInputSubmit={onPatternInputSubmit}
            onPatternInputCancel={onPatternInputCancel}
            onPatternCreateRequest={onPatternCreateRequest}
            onPatternDelete={onPatternDelete}
            onFolderCreateRequest={onFolderCreateRequest}
            nested
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function PatternList({
  folderId,
  patterns,
  showEmpty,
  selectedPatternId,
  onPatternSelect,
  pendingPatternInput,
  onPatternInputSubmit,
  onPatternInputCancel,
  onPatternCreateRequest,
  onPatternDelete,
  onFolderCreateRequest,
  nested = true,
}: {
  folderId: string | null
  patterns: Pattern[]
  showEmpty?: boolean
  selectedPatternId?: string
  onPatternSelect?: (patternId?: string) => void
  pendingPatternInput?: PendingPatternInput | null
  onPatternInputSubmit?: (name: string, folderId: string | null) => void
  onPatternInputCancel?: () => void
  onPatternCreateRequest?: (folderId: string | null) => void
  onPatternDelete?: (patternId: string) => void
  onFolderCreateRequest?: (parentId: string | null) => void
  nested?: boolean
}) {
  const showCreationRow = pendingPatternInput?.folderId === folderId
  const hasPatterns = patterns.length > 0
  const shouldRenderMenu = hasPatterns || showCreationRow

  return (
    <>
      {shouldRenderMenu && (
        <SidebarMenu className={cn("gap-1", nested ? "mt-1" : "mt-0 px-0")}>
          {patterns.map((pattern) => {
            const isSelected = pattern.id === selectedPatternId

            return (
              <SidebarMenuItem key={pattern.id}>
                <PatternMenuItem
                  pattern={pattern}
                  isSelected={isSelected}
                  folderId={folderId}
                  onPatternSelect={onPatternSelect}
                  onPatternCreateRequest={onPatternCreateRequest}
                  onFolderCreateRequest={onFolderCreateRequest}
                  onPatternDelete={onPatternDelete}
                />
              </SidebarMenuItem>
            )
          })}
          {showCreationRow && pendingPatternInput && (
            <SidebarMenuItem
              key={`pattern-input-${pendingPatternInput.token}`}
              className={cn("px-0", !nested && "px-1")}
            >
              <SidebarMenuButton
                asChild
                className={cn("cursor-text", !nested && "px-2")}
                data-tree-interactive="true"
              >
                <InlineCreateInput
                  placeholder="새 패턴 이름"
                  onSubmit={(value) => onPatternInputSubmit?.(value, folderId)}
                  onCancel={onPatternInputCancel ?? (() => {})}
                  className="px-2"
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      )}
      {!hasPatterns && showEmpty && !showCreationRow && (
        <div
          className={cn(
            "text-muted-foreground/80 text-xs",
            nested ? "ml-3 border-l border-dashed border-border/50 pl-3" : "px-2 py-2"
          )}
        >
          아직 패턴이 없습니다.
        </div>
      )}
    </>
  )
}

type PatternMenuItemProps = {
  pattern: Pattern
  isSelected: boolean
  folderId: string | null
  onPatternSelect?: (patternId?: string) => void
  onPatternCreateRequest?: (folderId: string | null) => void
  onFolderCreateRequest?: (parentId: string | null) => void
  onPatternDelete?: (patternId: string) => void
}

function PatternMenuItem({
  pattern,
  isSelected,
  folderId,
  onPatternSelect,
  onPatternCreateRequest,
  onFolderCreateRequest,
  onPatternDelete,
}: PatternMenuItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <SidebarMenuButton
          data-tree-interactive="true"
          className={cn(
            "h-auto items-start gap-2 py-2 px-3 transition-colors",
            isSelected && "bg-primary/10 text-primary ring-1 ring-primary/40"
          )}
          type="button"
          onClick={() => onPatternSelect?.(pattern.id)}
          onPointerDown={(event) => {
            if (event.button === 2) {
              onPatternSelect?.(pattern.id)
            }
          }}
          onContextMenu={() => onPatternSelect?.(pattern.id)}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium">{pattern.name}</span>
            <span className="text-xs text-muted-foreground">{pattern.serviceName}</span>
          </div>
        </SidebarMenuButton>
      </ContextMenuTrigger>
      <ContextMenuContent
        align="start"
        className="w-44"
        onCloseAutoFocus={(event) => event.preventDefault()} // 새 입력창 포커스 유지
      >
        <ContextMenuItem onSelect={() => onPatternCreateRequest?.(folderId)}>
          새 패턴
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onFolderCreateRequest?.(folderId)}>
          새 폴더
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onPatternDelete?.(pattern.id)}
        >
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
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
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sidebarWidth, setSidebarWidth] = React.useState(SIDEBAR_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = React.useState(false)
  const [activeNavId, setActiveNavId] = React.useState(PRIMARY_NAV_ITEMS[0]?.id ?? "")
  const isSidebarCollapsed = sidebarState === "collapsed"
  const resizeStateRef = React.useRef<{ startX: number; startWidth: number }>({
    startX: 0,
    startWidth: SIDEBAR_DEFAULT_WIDTH,
  })
  const liveWidthRef = React.useRef(SIDEBAR_DEFAULT_WIDTH)
  const handleRef = React.useRef<HTMLDivElement | null>(null)

  const navOffsetValue = React.useMemo(
    () => (isMobile ? "0px" : NAV_RAIL_WIDTH),
    [isMobile]
  )

  const getHandleStyle = React.useCallback(
    (width: number): React.CSSProperties => {
      const offset = RESIZE_HANDLE_WIDTH / 2
      if (sideProp === "right") {
        return { right: `${width - offset}px`, width: RESIZE_HANDLE_WIDTH }
      }
      const basePosition = `${width - offset}px`
      return {
        left: isMobile ? basePosition : `calc(${navOffsetValue} + ${basePosition})`,
        width: RESIZE_HANDLE_WIDTH,
      }
    },
    [isMobile, navOffsetValue, sideProp]
  )

  const sidebarStyle = React.useMemo(
    () =>
      ({
        ...(incomingStyle ?? {}),
        "--sidebar-width": `var(${LIVE_WIDTH_CSS_VAR}, ${sidebarWidth}px)`,
        "--nav-rail-width": navOffsetValue,
      }) as React.CSSProperties,
    [incomingStyle, navOffsetValue, sidebarWidth]
  )

  const applyWidthStyles = React.useCallback(
    (width: number) => {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(LIVE_WIDTH_CSS_VAR, `${width}px`)
      }
      const handleEl = handleRef.current
      if (handleEl) {
        const handleStyle = getHandleStyle(width)
        const resolveCssValue = (value?: string | number) => {
          if (typeof value === "number") {
            return `${value}px`
          }
          return value
        }
        const resolvedWidth = resolveCssValue(handleStyle.width) ?? `${RESIZE_HANDLE_WIDTH}px`
        handleEl.style.width = resolvedWidth
        const leftValue = resolveCssValue(handleStyle.left)
        const rightValue = resolveCssValue(handleStyle.right)
        if (leftValue !== undefined) {
          handleEl.style.left = leftValue
          handleEl.style.right = ""
        } else if (rightValue !== undefined) {
          handleEl.style.right = rightValue
          handleEl.style.left = ""
        }
      }
    },
    [getHandleStyle]
  )

  React.useEffect(() => {
    liveWidthRef.current = sidebarWidth
    applyWidthStyles(sidebarWidth)
  }, [applyWidthStyles, sidebarWidth])

  React.useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.style.removeProperty(LIVE_WIDTH_CSS_VAR)
      }
    }
  }, [])

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

  React.useEffect(() => {
    if (selectedFolderId && !folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(null)
    }
  }, [selectedFolderId, folders])

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

      const affectedPatterns = patterns.filter((pattern) => folderIdSet.has(pattern.folderId))
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
      if (pendingPatternInput && folderIdSet.has(pendingPatternInput.folderId)) {
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

  const handleResizeStart = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType !== "touch") {
        return
      }
      event.preventDefault()
      resizeStateRef.current = {
        startX: event.clientX,
        startWidth: liveWidthRef.current,
      }
      setIsResizing(true)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    []
  )

  React.useEffect(() => {
    if (!isResizing) return

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - resizeStateRef.current.startX
      const adjustedDelta = sideProp === "right" ? -delta : delta
      const nextWidth = clamp(
        resizeStateRef.current.startWidth + adjustedDelta,
        SIDEBAR_MIN_WIDTH,
        SIDEBAR_MAX_WIDTH
      )
      liveWidthRef.current = nextWidth
      applyWidthStyles(nextWidth)
    }

    const stopResizing = () => {
      setIsResizing(false)
      setSidebarWidth(liveWidthRef.current)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopResizing)
    window.addEventListener("pointercancel", stopResizing)

    const previousUserSelect = document.body.style.userSelect
    const previousCursor = document.body.style.cursor
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopResizing)
      window.removeEventListener("pointercancel", stopResizing)
      document.body.style.userSelect = previousUserSelect
      document.body.style.cursor = previousCursor
    }
  }, [applyWidthStyles, isResizing, sideProp])

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

  const initialHandleStyle = React.useMemo(() => getHandleStyle(sidebarWidth), [getHandleStyle, sidebarWidth])
  const mergedClassName = React.useMemo(
    () => cn("overflow-hidden *:data-[sidebar=sidebar]:flex-row", className),
    [className]
  )

  return (
    <>
      {!isMobile && (
        <aside
          className="fixed inset-y-0 z-30 hidden border-r border-border/60 bg-sidebar py-2 md:flex md:flex-col"
          style={{ width: NAV_RAIL_WIDTH }}
        >
          <div className="px-1 pb-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" className="justify-center" aria-label="워크스페이스 홈">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarMenu>
              {PRIMARY_NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id} className="flex justify-center">
                  <NavRailButton
                    item={item}
                    isActive={activeNavId === item.id}
                    onSelect={() => handleNavItemSelect(item.id)}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
          <div className="border-t border-border/60 pt-2">
            <NavUser user={data.user} />
          </div>
        </aside>
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
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <a href="#">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                      <Command className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Acme Inc</span>
                      <span className="truncate text-xs">Enterprise</span>
                    </div>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            {activeNavItem && (
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  현재 보기
                </span>
                <span className="text-base font-medium text-foreground">{activeNavItem.title}</span>
                {activeNavItem.description && (
                  <span className="text-xs text-muted-foreground">{activeNavItem.description}</span>
                )}
              </div>
            )}
          </SidebarHeader>
          <SidebarContent className="flex flex-1 flex-col">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className="flex flex-1 flex-col"
                  onClick={handleTreeBackgroundClick}
                  onContextMenu={handleTreeBackgroundContextMenu}
                >
                  <SidebarGroup>
                    <div className="px-1 pb-2">
                      <Input
                        type="search"
                        placeholder="패턴 검색"
                        aria-label="패턴 검색"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-8 border-border bg-sidebar text-sm"
                        data-tree-interactive="true"
                      />
                    </div>
                    <SidebarGroupLabel className="flex items-center justify-between gap-2">
                      <span
                        role="button"
                        tabIndex={0}
                        className="select-none"
                        onClick={clearSelection}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            clearSelection()
                          }
                        }}
                      >
                        내 아카이브
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground"
                          aria-label="새 패턴 추가"
                          onClick={() => openPatternInput(null)}
                        >
                          <FilePlus className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground"
                          aria-label="새 폴더 추가"
                          onClick={() => openFolderInput(null)}
                        >
                          <FolderPlus className="size-4" />
                        </Button>
                      </div>
                    </SidebarGroupLabel>
                    <SidebarGroupContent className="flex flex-col gap-2">
                      <div className="rounded-md">
                        <FolderTree
                          folders={folders}
                          patterns={patterns}
                          selectedPatternId={uiSelectedPatternId ?? undefined}
                          onPatternSelect={handlePatternSelect}
                          pendingPatternInput={pendingPatternInput}
                          pendingFolderInput={pendingFolderInput}
                          onPatternInputSubmit={handlePatternInputSubmit}
                          onPatternInputCancel={() => setPendingPatternInput(null)}
                          onFolderInputSubmit={handleFolderInputSubmit}
                          onFolderInputCancel={() => setPendingFolderInput(null)}
                          selectedFolderId={selectedFolderId}
                          onFolderSelect={handleFolderSelect}
                          onPatternCreateRequest={beginPatternCreation}
                          onFolderCreateRequest={beginFolderCreation}
                          onPatternDelete={handlePatternDelete}
                          onFolderDelete={handleFolderDelete}
                        />
                      </div>
                    </SidebarGroupContent>
                  </SidebarGroup>
                  <div
                    className="flex-1"
                    onClick={handleTreeBackgroundClick}
                    onContextMenu={handleTreeBackgroundContextMenu}
                    data-tree-interactive="false"
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent
                align="start"
                className="w-48"
                onCloseAutoFocus={(event) => event.preventDefault()} // 새 입력창 포커스 유지
              >
                <ContextMenuItem onSelect={() => openPatternInput(null)}>
                  새 패턴
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => openFolderInput(null)}>새 폴더</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
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
          style={initialHandleStyle}
          onPointerDown={handleResizeStart}
          data-sidebar-resizer="true"
        />
      )}
    </>
  )
}

type InlineCreateInputProps = {
  placeholder: string
  onSubmit: (value: string) => void
  onCancel: () => void
  className?: string
}

function InlineCreateInput({ placeholder, onSubmit, onCancel, className }: InlineCreateInputProps) {
  const [value, setValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const finishedRef = React.useRef(false)

  React.useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  const cancel = React.useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onCancel()
  }, [onCancel])

  const submit = React.useCallback(() => {
    if (finishedRef.current) return
    const trimmed = value.trim()
    if (!trimmed) {
      cancel()
      return
    }
    finishedRef.current = true
    onSubmit(trimmed)
  }, [cancel, onSubmit, value])

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-8 w-full border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:outline-none",
        className
      )}
      onBlur={() => {
        if (!value.trim()) {
          cancel()
        } else {
          submit()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          submit()
        }
        if (event.key === "Escape") {
          event.preventDefault()
          cancel()
        }
      }}
    />
  )
}
