"use client"

import * as React from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  Folder as FolderIcon,
  LibraryBig,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  SidebarMenu,
  SidebarMenuAction,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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

type MoveDialogTarget =
  | { type: "pattern"; pattern: Pattern }
  | { type: "folder"; folder: Folder }

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
  onPatternMove?: (patternId: string, destinationFolderId: string | null) => void
  onFolderMove?: (folderId: string, destinationFolderId: string | null) => void
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
  onPatternMove,
  onFolderMove,
}: FolderTreeProps) {
  const [pendingFolderDelete, setPendingFolderDelete] = React.useState<Folder | null>(null)
  const [moveDialogTarget, setMoveDialogTarget] = React.useState<MoveDialogTarget | null>(null)
  const [moveDestinationId, setMoveDestinationId] = React.useState<string | null>(null)

  const handleFolderDeleteRequest = React.useCallback((folder: Folder) => {
    setPendingFolderDelete(folder)
  }, [])

  const handleFolderDeleteConfirm = React.useCallback(() => {
    if (!pendingFolderDelete) return
    onFolderDelete?.(pendingFolderDelete.id)
    setPendingFolderDelete(null)
  }, [onFolderDelete, pendingFolderDelete])

  const openPatternMoveDialog = React.useCallback((pattern: Pattern) => {
    setMoveDialogTarget({ type: "pattern", pattern })
    setMoveDestinationId(pattern.folderId ?? null)
  }, [])

  const openFolderMoveDialog = React.useCallback((folder: Folder) => {
    setMoveDialogTarget({ type: "folder", folder })
    setMoveDestinationId(folder.parentId ?? null)
  }, [])

  const closeMoveDialog = React.useCallback(() => {
    setMoveDialogTarget(null)
    setMoveDestinationId(null)
  }, [])

  const tree = React.useMemo(() => buildFolderTree(folders, patterns), [folders, patterns])
  const folderOptions = React.useMemo(() => flattenFolderTreeNodes(tree), [tree])
  const folderChildrenMap = React.useMemo(() => buildFolderChildrenMap(folders), [folders])
  const rootPatterns = React.useMemo(
    () =>
      patterns.filter(
        (pattern) => !pattern.folderId || !folders.some((folder) => folder.id === pattern.folderId)
      ),
    [folders, patterns]
  )
  const shouldShowRootPatterns = rootPatterns.length > 0 || pendingPatternInput?.folderId === null
  const shouldShowRootFolders = tree.length > 0 || pendingFolderInput?.parentId === null
  const excludedFolderIds = React.useMemo(() => {
    if (!moveDialogTarget || moveDialogTarget.type !== "folder") {
      return new Set<string>()
    }
    return collectDescendantFolderIds(folderChildrenMap, moveDialogTarget.folder.id)
  }, [folderChildrenMap, moveDialogTarget])
  const isMoveConfirmDisabled = React.useMemo(() => {
    if (!moveDialogTarget) return true
    const destinationId = moveDestinationId ?? null
    if (moveDialogTarget.type === "folder") {
      if (destinationId === moveDialogTarget.folder.id) {
        return true
      }
      if (destinationId && excludedFolderIds.has(destinationId)) {
        return true
      }
      const currentParentId = moveDialogTarget.folder.parentId ?? null
      return currentParentId === destinationId
    }
    const currentFolderId = moveDialogTarget.pattern.folderId ?? null
    return currentFolderId === destinationId
  }, [excludedFolderIds, moveDestinationId, moveDialogTarget])
  const moveDialogTitle = moveDialogTarget
    ? moveDialogTarget.type === "pattern"
      ? "Move pattern"
      : "Move folder"
    : ""
  const moveDialogEntityName = moveDialogTarget
    ? moveDialogTarget.type === "pattern"
      ? moveDialogTarget.pattern.name
      : moveDialogTarget.folder.name
    : ""
  const moveDialogDescription = moveDialogTarget
    ? `Select a folder to move "${moveDialogEntityName}" into.`
    : ""
  const handleMoveConfirm = React.useCallback(() => {
    if (!moveDialogTarget) return
    const destinationId = moveDestinationId ?? null
    if (moveDialogTarget.type === "pattern") {
      const currentFolderId = moveDialogTarget.pattern.folderId ?? null
      if (currentFolderId === destinationId) {
        closeMoveDialog()
        return
      }
      onPatternMove?.(moveDialogTarget.pattern.id, destinationId)
      closeMoveDialog()
      return
    }
    if (destinationId === moveDialogTarget.folder.id) {
      return
    }
    if (destinationId && excludedFolderIds.has(destinationId)) {
      return
    }
    const currentParentId = moveDialogTarget.folder.parentId ?? null
    if (currentParentId === destinationId) {
      closeMoveDialog()
      return
    }
    onFolderMove?.(moveDialogTarget.folder.id, destinationId)
    closeMoveDialog()
  }, [closeMoveDialog, excludedFolderIds, moveDestinationId, moveDialogTarget, onFolderMove, onPatternMove])

  if (!tree.length && !pendingFolderInput && !shouldShowRootPatterns) {
    return (
      <div className="text-sidebar-foreground/70 rounded-md border border-dashed border-border/60 px-3 py-4 text-xs">
        No folders available.
      </div>
    )
  }

  return (
    <>
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
            onFolderDeleteRequest={handleFolderDeleteRequest}
            onPatternMoveRequest={openPatternMoveDialog}
            onFolderMoveRequest={openFolderMoveDialog}
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
          onPatternMoveRequest={openPatternMoveDialog}
        />
      )}
      </div>
      <AlertDialog
        open={Boolean(pendingFolderDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFolderDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFolderDelete
                ? `Deleting "${pendingFolderDelete.name}" also removes its subfolders and patterns.`
                : "All child items will be removed as well."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFolderDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(moveDialogTarget)}
        onOpenChange={(open) => {
          if (!open) {
            closeMoveDialog()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moveDialogTitle || "Move item"}</DialogTitle>
            {moveDialogDescription && <DialogDescription>{moveDialogDescription}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border">
              <Command className="max-h-[320px] bg-transparent">
                <CommandInput placeholder="Search folders" />
                <CommandList>
                  <CommandEmpty>No folders match your search.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="My Archive"
                      onSelect={() => setMoveDestinationId(null)}
                    >
                      <LibraryBig className="mr-2 size-4 text-muted-foreground" />
                      <span className="flex-1 truncate">My Archive</span>
                      <Check
                        className={cn(
                          "size-4 text-primary opacity-0",
                          moveDialogTarget && moveDestinationId === null && "opacity-100"
                        )}
                      />
                    </CommandItem>
                    {folderOptions.map((option) => {
                      const isSelected = moveDestinationId === option.folder.id
                      const isDisabled = excludedFolderIds.has(option.folder.id)
                      return (
                        <CommandItem
                          key={option.folder.id}
                          value={option.pathLabel}
                          disabled={isDisabled}
                          onSelect={() => {
                            if (isDisabled) return
                            setMoveDestinationId(option.folder.id)
                          }}
                        >
                          <FolderIcon className="mr-2 size-4 text-muted-foreground" />
                          <span
                            className="flex flex-1 items-center gap-1 truncate"
                          >
                            {option.pathSegments.map((segment, index) => (
                              <React.Fragment key={`${option.folder.id}-${index}`}>
                                <span className="truncate text-left">{segment}</span>
                                {index < option.pathSegments.length - 1 && (
                                  <ChevronRight className="size-3 text-muted-foreground" />
                                )}
                              </React.Fragment>
                            ))}
                          </span>
                          {isDisabled && (
                            <span className="text-xs text-muted-foreground/70">Subfolders</span>
                          )}
                          <Check
                            className={cn(
                              "size-4 text-primary opacity-0",
                              isSelected && "opacity-100"
                            )}
                          />
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMoveDialog}>
              Cancel
            </Button>
            <Button onClick={handleMoveConfirm} disabled={isMoveConfirmDisabled}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

type FolderOption = {
  folder: Folder
  depth: number
  pathLabel: string
  pathSegments: string[]
}

const flattenFolderTreeNodes = (
  nodes: FolderTreeNode[],
  depth = 0,
  ancestors: string[] = [],
): FolderOption[] => {
  return nodes.flatMap((node) => {
    const currentPath = [...ancestors, node.folder.name]
    const option: FolderOption = {
      folder: node.folder,
      depth,
      pathLabel: currentPath.join(" > "),
      pathSegments: currentPath,
    }
    return [option, ...flattenFolderTreeNodes(node.children, depth + 1, currentPath)]
  })
}

const buildFolderChildrenMap = (folders: Folder[]): Map<string, string[]> => {
  const map = new Map<string, string[]>()
  folders.forEach((folder) => {
    const parentId = folder.parentId ?? null
    if (!parentId) return
    const current = map.get(parentId) ?? []
    current.push(folder.id)
    map.set(parentId, current)
  })
  return map
}

const collectDescendantFolderIds = (childrenMap: Map<string, string[]>, folderId: string) => {
  const collected = new Set<string>()
  const stack = [folderId]
  while (stack.length) {
    const current = stack.pop()
    if (!current || collected.has(current)) continue
    collected.add(current)
    const children = childrenMap.get(current)
    if (children?.length) {
      children.forEach((childId) => {
        if (!collected.has(childId)) {
          stack.push(childId)
        }
      })
    }
  }
  return collected
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
  onFolderDeleteRequest?: (folder: Folder) => void
  onPatternMoveRequest?: (pattern: Pattern) => void
  onFolderMoveRequest?: (folder: Folder) => void
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
  onFolderDeleteRequest,
  onPatternMoveRequest,
  onFolderMoveRequest,
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
            onFolderDeleteRequest={onFolderDeleteRequest}
            onPatternMoveRequest={onPatternMoveRequest}
            onFolderMoveRequest={onFolderMoveRequest}
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
                placeholder="New folder name"
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
  onFolderDeleteRequest?: (folder: Folder) => void
  onPatternMoveRequest?: (pattern: Pattern) => void
  onFolderMoveRequest?: (folder: Folder) => void
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
  onFolderDeleteRequest,
  onPatternMoveRequest,
  onFolderMoveRequest,
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
          className="w-44"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <ContextMenuItem onSelect={() => onPatternCreateRequest?.(node.folder.id)}>
            New pattern
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onFolderCreateRequest?.(node.folder.id)}>
            New folder
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onFolderMoveRequest?.(node.folder)}>
            Move
          </ContextMenuItem>
          <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault()
            if (onFolderDeleteRequest) {
              onFolderDeleteRequest(node.folder)
            } else {
              onFolderDelete?.(node.folder.id)
            }
          }}
        >
          Delete
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
              onFolderDeleteRequest={onFolderDeleteRequest}
              onPatternMoveRequest={onPatternMoveRequest}
              onFolderMoveRequest={onFolderMoveRequest}
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
            onPatternMoveRequest={onPatternMoveRequest}
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
  onPatternMoveRequest?: (pattern: Pattern) => void
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
  onPatternMoveRequest,
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
                  onPatternMoveRequest={onPatternMoveRequest}
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
                  placeholder="New pattern name"
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
          No patterns yet.
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
  onPatternMoveRequest?: (pattern: Pattern) => void
}

function PatternMenuItem({
  pattern,
  isSelected,
  folderId,
  onPatternSelect,
  onPatternCreateRequest,
  onFolderCreateRequest,
  onPatternDelete,
  onPatternMoveRequest,
}: PatternMenuItemProps) {
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const handleDeleteSelect = React.useCallback((event: Event | React.SyntheticEvent) => {
    event.preventDefault()
    setDeleteDialogOpen(true)
  }, [])

  const handleMenuActionClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      onPatternSelect?.(pattern.id)
      const rect = event.currentTarget.getBoundingClientRect()
      const syntheticEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        view: window,
      })
      event.currentTarget.dispatchEvent(syntheticEvent)
    },
    [onPatternSelect, pattern.id]
  )

  const handleConfirmDelete = React.useCallback(() => {
    onPatternDelete?.(pattern.id)
    setDeleteDialogOpen(false)
  }, [onPatternDelete, pattern.id])

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative w-full">
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
            <SidebarMenuAction
              {...allowContextMenuProps}
              type="button"
              aria-label={`Open context menu for ${pattern.name}`}
              onClick={handleMenuActionClick}
              onContextMenu={() => onPatternSelect?.(pattern.id)}
              className="!top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <EllipsisVertical className="size-4" />
              <span className="sr-only">Toggle pattern context menu</span>
            </SidebarMenuAction>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-44"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <ContextMenuItem onSelect={() => onPatternCreateRequest?.(folderId)}>
            New pattern
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onFolderCreateRequest?.(folderId)}>
            New folder
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onPatternMoveRequest?.(pattern)}>
            Move
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleDeleteSelect}
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pattern?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Deleting "${pattern.name}" removes all associated captures and insights.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
