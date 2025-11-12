"use client"

import * as React from "react"
import { ChevronDown, Folder as FolderIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import type { Folder, Pattern } from "@/lib/types"
import { allowContextMenuProps } from "@/lib/context-menu"
import { cn } from "@/lib/utils"

type FolderTreeNode = {
  folder: Folder
  patterns: Pattern[]
  children: FolderTreeNode[]
}

export type PendingPatternInput = {
  folderId: string | null
  token: string
}

export type PendingFolderInput = {
  parentId: string | null
  token: string
}

type FolderTreeProps = {
  folders: Folder[]
  patterns: Pattern[]
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
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
}

export function FolderTree({
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
}: FolderTreeProps) {
  const tree = React.useMemo(() => buildFolderTree(folders, patterns), [folders, patterns])
  const rootPatterns = React.useMemo(
    () =>
      patterns.filter(
        (pattern) => !pattern.folderId || !folders.some((folder) => folder.id === pattern.folderId)
      ),
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

type FolderMenuListProps = {
  nodes: FolderTreeNode[]
  parentId?: string | null
  nested?: boolean
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
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
}: FolderMenuListProps) {
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

type FolderNodeItemProps = {
  node: FolderTreeNode
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
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
}: FolderNodeItemProps) {
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
              {...allowContextMenuProps}
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
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <ContextMenuItem onSelect={() => onPatternCreateRequest?.(node.folder.id)}>
            새 패턴
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onFolderCreateRequest?.(node.folder.id)}>
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
              parentId={node.folder.id}
              nested
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

type PatternListProps = {
  folderId: string | null
  patterns: Pattern[]
  showEmpty?: boolean
  selectedPatternId?: string
  onPatternSelect?: (patternId: string) => void
  pendingPatternInput?: PendingPatternInput | null
  onPatternInputSubmit?: (name: string, folderId: string | null) => void
  onPatternInputCancel?: () => void
  onPatternCreateRequest?: (folderId: string | null) => void
  onPatternDelete?: (patternId: string) => void
  onFolderCreateRequest?: (parentId: string | null) => void
  nested?: boolean
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
}: PatternListProps) {
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
  onPatternSelect?: (patternId: string) => void
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
          {...allowContextMenuProps}
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
        onCloseAutoFocus={(event) => event.preventDefault()}
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
