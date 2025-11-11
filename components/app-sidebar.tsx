"use client"

import * as React from "react"
import { ChevronDown, Command, Folder as FolderIcon, LifeBuoy, Send } from "lucide-react"

import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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
} from "@/components/ui/sidebar"
import { mockFolders, mockPatterns } from "@/lib/mock-data"
import type { Folder, Pattern } from "@/lib/types"
import { cn } from "@/lib/utils"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
}

type FolderTreeNode = {
  folder: Folder
  patterns: Pattern[]
  children: FolderTreeNode[]
}

const buildFolderTree = (): FolderTreeNode[] => {
  const nodeMap = new Map<string, FolderTreeNode>()

  mockFolders.forEach((folder) => {
    nodeMap.set(folder.id, {
      folder,
      patterns: [],
      children: [],
    })
  })

  mockPatterns.forEach((pattern) => {
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

function FolderTree({
  selectedPatternId,
  onPatternSelect,
}: {
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
}) {
  const tree = React.useMemo(() => buildFolderTree(), [])

  if (!tree.length) {
    return (
      <div className="text-sidebar-foreground/70 rounded-md border border-dashed border-border/60 px-3 py-4 text-xs">
        폴더 데이터가 없습니다.
      </div>
    )
  }

  return (
    <FolderMenuList
      nodes={tree}
      selectedPatternId={selectedPatternId}
      onPatternSelect={onPatternSelect}
    />
  )
}

function FolderMenuList({
  nodes,
  nested = false,
  selectedPatternId,
  onPatternSelect,
}: {
  nodes: FolderTreeNode[]
  nested?: boolean
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
}) {
  return (
    <SidebarMenu className={nested ? "" : undefined}>
      {nodes.map((node) => (
        <SidebarMenuItem key={node.folder.id} className="px-0">
          <FolderNodeItem
            node={node}
            selectedPatternId={selectedPatternId}
            onPatternSelect={onPatternSelect}
          />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function FolderNodeItem({
  node,
  selectedPatternId,
  onPatternSelect,
}: {
  node: FolderTreeNode
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
}) {
  const hasChildren = node.children.length > 0
  const totalPatterns = getPatternCount(node)

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <CollapsibleTrigger asChild>
        <SidebarMenuButton className="justify-between">
          <span className="flex flex-1 items-center gap-2">
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
            <FolderIcon className="size-4 text-muted-foreground" />
            <span className="truncate font-medium">{node.folder.name}</span>
          </span>
          <span className="text-xs text-muted-foreground">{totalPatterns}</span>
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-l border-border/40 pl-3">
          {hasChildren && (
            <FolderMenuList
              nodes={node.children}
              nested
              selectedPatternId={selectedPatternId}
              onPatternSelect={onPatternSelect}
            />
          )}
          <PatternList
            patterns={node.patterns}
            showEmpty={!hasChildren}
            selectedPatternId={selectedPatternId}
            onPatternSelect={onPatternSelect}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function PatternList({
  patterns,
  showEmpty,
  selectedPatternId,
  onPatternSelect,
}: {
  patterns: Pattern[]
  showEmpty?: boolean
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
}) {
  if (!patterns.length && showEmpty) {
    return (
      <div className="text-muted-foreground/80 ml-3 border-l border-dashed border-border/50 pl-3 text-xs">
        아직 패턴이 없습니다.
      </div>
    )
  }

  if (!patterns.length) {
    return null
  }

  return (
    <SidebarMenu className="gap-1 mt-1">
      {patterns.map((pattern) => {
        const isSelected = pattern.id === selectedPatternId

        return (
          <SidebarMenuItem key={pattern.id}>
            <SidebarMenuButton
              className={cn(
                "h-auto items-start gap-2 py-2 transition-colors",
                isSelected &&
                  "text-primary font-semibold ring-1 ring-primary/50 shadow-sm"
              )}
              isActive={isSelected}
              type="button"
              onClick={() => onPatternSelect?.(pattern.id)}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{pattern.name}</span>
                <span className="text-xs text-muted-foreground">
                  {pattern.serviceName}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
}

export function AppSidebar({
  selectedPatternId,
  onPatternSelect,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>내 아카이브</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <FolderTree
              selectedPatternId={selectedPatternId}
              onPatternSelect={onPatternSelect}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
