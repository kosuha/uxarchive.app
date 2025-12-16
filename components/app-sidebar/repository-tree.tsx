"use client"

import * as React from "react"
import {
    ChevronRight,
    Folder as FolderIcon,
    Archive,
    MoreHorizontal,
    Plus,
    FileImage
} from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuAction,
} from "@/components/ui/sidebar"
import { ItemContextMenu } from "@/components/item-context-menu"
import { cn } from "@/lib/utils"
import type { AssetRecord } from "@/lib/repositories/assets"

// Types adapted for V2.1
type RepositoryNode = {
    id: string
    name: string
    type: "repository"
    children: FolderNode[]
}

type FolderNode = {
    id: string
    name: string
    type: "folder"
    children: FolderNode[]
    assets: AssetRecord[]
}

interface RepositoryTreeProps {
    repositories: { id: string, name: string }[]
    folders: { id: string, name: string, parentId: string | null, repositoryId: string }[]
    assets?: AssetRecord[]
    selectedRepositoryId: string | null
    selectedFolderId: string | null
    onSelectRepository: (id: string) => void
    onSelectFolder: (id: string) => void
    onCreateRepository: () => void
    // Action handlers passed from parent
    onForkRepository?: (repo: { id: string, name: string, description?: string }) => void
    onSnapshotRepository?: (id: string) => void
    onDeleteRepository?: (id: string) => void
    onDeleteFolder?: (id: string) => void
}

export function RepositoryTree({
    repositories,
    folders,
    assets = [],
    selectedRepositoryId,
    selectedFolderId,
    onSelectRepository,
    onSelectFolder,
    onCreateRepository,
    onForkRepository,
    onSnapshotRepository,
    onDeleteRepository,
    onDeleteFolder
}: RepositoryTreeProps) {

    // Helper to build tree for a specific repo
    const buildFolderTree = (repoId: string) => {
        const repoFolders = folders.filter(f => f.repositoryId === repoId)
        const nodeMap = new Map<string, FolderNode>()

        // Init nodes
        repoFolders.forEach(f => {
            nodeMap.set(f.id, { id: f.id, name: f.name, type: "folder", children: [], assets: [] })
        })

        const roots: FolderNode[] = []

        // Build hierarchy
        repoFolders.forEach(f => {
            const node = nodeMap.get(f.id)!
            if (f.parentId) {
                const parent = nodeMap.get(f.parentId)
                if (parent) {
                    parent.children.push(node)
                } else {
                    // Orphaned? treat as root for safety
                    roots.push(node)
                }
            } else {
                roots.push(node)
            }
        })

        // Distribute assets
        const repoAssets = assets.filter(a => a.repositoryId === repoId)
        repoAssets.forEach(asset => {
            if (asset.folderId) {
                const folderNode = nodeMap.get(asset.folderId)
                if (folderNode) {
                    folderNode.assets.push(asset)
                }
            }
        })

        // Sort
        const sortNodes = (nodes: FolderNode[]) => {
            nodes.sort((a, b) => a.name.localeCompare(b.name))
            nodes.forEach(n => {
                sortNodes(n.children)
                n.assets.sort((a, b) => (a.order - b.order))
            })
        }
        sortNodes(roots)

        const rootAssets = repoAssets.filter(a => !a.folderId).sort((a, b) => a.order - b.order)

        return { roots, rootAssets }
    }

    // Manage open state for collapsibles
    const [openRepoIds, setOpenRepoIds] = React.useState<string[]>([])

    // Auto-expand selected repository
    React.useEffect(() => {
        if (selectedRepositoryId) {
            setOpenRepoIds(prev => {
                if (prev.includes(selectedRepositoryId)) return prev
                return [...prev, selectedRepositoryId]
            })
        }
    }, [selectedRepositoryId])

    const toggleRepo = (repoId: string) => {
        setOpenRepoIds(prev => prev.includes(repoId) ? prev.filter(id => id !== repoId) : [...prev, repoId])
    }

    return (
        <SidebarMenu>
            {/* Header / Title similar to old ExploreView */}
            <div className="flex items-center justify-between px-2 py-2 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                <span className="text-xs font-medium">Repositories</span>
                <button onClick={onCreateRepository} className="hover:bg-sidebar-accent rounded p-1">
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            {repositories.map(repo => (
                <Collapsible
                    key={repo.id}
                    open={openRepoIds.includes(repo.id)}
                    onOpenChange={(isOpen) => {
                        if (isOpen && !openRepoIds.includes(repo.id)) toggleRepo(repo.id)
                        else if (!isOpen && openRepoIds.includes(repo.id)) toggleRepo(repo.id)
                    }}
                    className="group/collapsible"
                >
                    <SidebarMenuItem>
                        <div className="flex items-center w-full gap-0.5 pr-2">
                            {/* Chevron Button (Left) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleRepo(repo.id) }}
                                className="p-1 min-w-[24px] h-6 flex items-center justify-center hover:bg-sidebar-accent rounded-sm text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                                <ChevronRight className={cn(
                                    "h-3 w-3 transition-transform duration-200",
                                    openRepoIds.includes(repo.id) ? "rotate-90" : ""
                                )} />
                            </button>

                            {/* Content Button (Right) */}
                            <ItemContextMenu
                                type="repository"
                                onFork={() => onForkRepository?.(repo)}
                                onSnapshots={() => onSnapshotRepository?.(repo.id)}
                                onDelete={() => onDeleteRepository?.(repo.id)}
                            >
                                <SidebarMenuButton
                                    isActive={repo.id === selectedRepositoryId && !selectedFolderId}
                                    onClick={() => onSelectRepository(repo.id)}
                                    className="h-7 px-2"
                                >
                                    <Archive className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">{repo.name}</span>
                                </SidebarMenuButton>
                            </ItemContextMenu>
                        </div>

                        <CollapsibleContent>
                            {/* Indentation handled by padding in generic UL if needed, or recursive margin */}
                            <div className="flex flex-col gap-0.5 pl-4 relative border-l border-border/40 ml-2.5 my-1">
                                <FolderList
                                    data={buildFolderTree(repo.id)}
                                    selectedFolderId={selectedFolderId}
                                    onSelectFolder={onSelectFolder}
                                    onDeleteFolder={onDeleteFolder}
                                />
                            </div>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            ))}
        </SidebarMenu>
    )
}

interface FolderListData {
    roots: FolderNode[]
    rootAssets: AssetRecord[]
}

// Helper to manage folder open states
function FolderList({ data, selectedFolderId, onSelectFolder, onDeleteFolder }: {
    data: FolderListData,
    selectedFolderId: string | null,
    onSelectFolder: (id: string) => void,
    onDeleteFolder?: (id: string) => void
}) {
    const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>({})

    if (data.roots.length === 0 && data.rootAssets.length === 0) return null

    const toggleFolder = (folderId: string) => {
        setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }))
    }

    return (
        <>
            {data.roots.map(node => {
                const hasChildren = node.children.length + node.assets.length > 0;
                const isOpen = openFolders[node.id];

                return (
                    <Collapsible
                        key={node.id}
                        className="group/folder"
                        open={isOpen}
                        onOpenChange={(open) => setOpenFolders(prev => ({ ...prev, [node.id]: open }))}
                    >
                        <div className="flex items-center w-full gap-0.5">
                            {/* Chevron: Only if has children */}
                            {hasChildren ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleFolder(node.id) }}
                                    className="p-1 min-w-[24px] h-6 flex items-center justify-center hover:bg-sidebar-accent rounded-sm text-muted-foreground hover:text-foreground focus:outline-none"
                                >
                                    <ChevronRight className={cn(
                                        "h-3 w-3 transition-transform duration-200",
                                        isOpen ? "rotate-90" : ""
                                    )} />
                                </button>
                            ) : (
                                // Spacer to align with items that have chevrons
                                <div className="w-[24px] h-6 shrink-0" />
                            )}

                            <ItemContextMenu
                                type="folder"
                                onDelete={() => onDeleteFolder?.(node.id)}
                            >
                                <SidebarMenuButton
                                    isActive={node.id === selectedFolderId}
                                    onClick={() => {
                                        onSelectFolder(node.id);
                                        // Optional: Toggle on main click too? User asked for chevron control mostly, but standard is click=select/expand.
                                        // Let's stick to click=select. Chevron=toggle.
                                    }}
                                    className="h-7 px-2 flex-1 min-w-0"
                                >
                                    <FolderIcon className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">{node.name}</span>
                                </SidebarMenuButton>
                            </ItemContextMenu>
                        </div>

                        <CollapsibleContent>
                            <div className="flex flex-col gap-0.5 pl-4 relative border-l border-border/40 ml-2.5 my-1">
                                <FolderList
                                    data={{ roots: node.children, rootAssets: node.assets }}
                                    selectedFolderId={selectedFolderId}
                                    onSelectFolder={onSelectFolder}
                                    onDeleteFolder={onDeleteFolder}
                                />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )
            })}

            {data.rootAssets.map(asset => (
                <div key={asset.id} className="flex items-center w-full gap-0.5">
                    {/* Spacer for no-chevron items */}
                    <div className="w-[24px] h-6 shrink-0" />
                    <SidebarMenuButton
                        className="h-7 px-2 flex-1 min-w-0 text-muted-foreground hover:text-foreground"
                    >
                        <FileImage className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{(asset.meta as any)?.name || "Asset"}</span>
                    </SidebarMenuButton>
                </div>
            ))}
        </>
    )
}
