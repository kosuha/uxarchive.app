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
            } else {
                // Root assets? 
                // Currently FolderList renders `nodes` (FolderNode[]).
                // We need a way to pass Root Assets to FolderList or handle them.
                // NOTE: The current structure expects only Folders at the top level of `FolderList`.
                // But we can create a "pseudo-node" or modify FolderList to accept assets.
                // However, `FolderList` recurses.
                // Let's modify logic: `buildFolderTree` returns `FolderNode[]` but we also need `rootAssets`.
                // Or we can return a structure { folders: FolderNode[], assets: AssetRecord[] }.
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

    return (
        <SidebarMenu>
            {/* Header / Title similar to old ExploreView */}
            <div className="flex items-center justify-between px-2 py-2 text-sidebar-foreground/70">
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
                        setOpenRepoIds(prev => isOpen ? [...prev, repo.id] : prev.filter(id => id !== repo.id))
                    }}
                    className="group/collapsible"
                >
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            {/* Use SidebarMenuButton wrapped in ItemContextMenu logic */}
                            {/* Wait, ItemContextMenu wraps children and provides trigger. */}
                            {/* SidebarMenuButton should be the trigger. */}
                            <ItemContextMenu
                                type="repository"
                                onFork={() => onForkRepository?.(repo)}
                                onSnapshots={() => onSnapshotRepository?.(repo.id)}
                                onDelete={() => onDeleteRepository?.(repo.id)}
                            >
                                <SidebarMenuButton
                                    isActive={repo.id === selectedRepositoryId && !selectedFolderId}
                                    onClick={() => onSelectRepository(repo.id)}
                                >
                                    <Archive className="mr-2 h-4 w-4" />
                                    <span>{repo.name}</span>
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                            </ItemContextMenu>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <SidebarMenuSub>
                                <FolderList
                                    data={buildFolderTree(repo.id)}
                                    selectedFolderId={selectedFolderId}
                                    onSelectFolder={onSelectFolder}
                                    onDeleteFolder={onDeleteFolder}
                                />
                            </SidebarMenuSub>
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

function FolderList({ data, selectedFolderId, onSelectFolder, onDeleteFolder }: {
    data: FolderListData,
    selectedFolderId: string | null,
    onSelectFolder: (id: string) => void,
    onDeleteFolder?: (id: string) => void
}) {
    if (data.roots.length === 0 && data.rootAssets.length === 0) return null

    return (
        <>
            {data.roots.map(node => (
                <Collapsible key={node.id} className="group/folder">
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <ItemContextMenu
                                type="folder"
                                onDelete={() => onDeleteFolder?.(node.id)}
                            >
                                <SidebarMenuButton
                                    isActive={node.id === selectedFolderId}
                                    onClick={() => onSelectFolder(node.id)}
                                    className="pl-6" // Indent
                                >
                                    <FolderIcon className="mr-2 h-4 w-4" />
                                    <span>{node.name}</span>
                                    {node.children.length + node.assets.length > 0 && (
                                        <ChevronRight className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/folder:rotate-90" />
                                    )}
                                </SidebarMenuButton>
                            </ItemContextMenu>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <ul className="border-l border-border ml-6 pl-2">
                                <FolderList
                                    data={{ roots: node.children, rootAssets: node.assets }}
                                    selectedFolderId={selectedFolderId}
                                    onSelectFolder={onSelectFolder}
                                    onDeleteFolder={onDeleteFolder}
                                />
                            </ul>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            ))}
            {data.rootAssets.map(asset => (
                <SidebarMenuItem key={asset.id}>
                    <SidebarMenuButton
                        className="pl-6 text-muted-foreground hover:text-foreground"
                    >
                        <FileImage className="mr-2 h-4 w-4" />
                        <span className="truncate">{(asset.meta as any)?.name || "Asset"}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </>
    )
}

function SidebarMenuSub({ children }: { children: React.ReactNode }) {
    return <ul className="flex flex-col gap-1 px-2 py-1">{children}</ul>
}
