"use client"

import * as React from "react"
import { Archive, ChevronRight, Folder as FolderIcon, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"
import { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"
import { AssetRecord } from "@/lib/repositories/assets"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"

interface PublicRepositoryTreeProps {
    repositoryName: string
    folders: RepositoryFolderRecord[]
    assets: AssetRecord[]
    currentFolderId: string | null
    selectedAssetId?: string | null
    onSelectFolder: (folderId: string | null) => void
    onSelectAsset?: (asset: AssetRecord) => void
}

type TreeNode = {
    id: string
    name: string
    type: 'folder' | 'asset'
    children?: TreeNode[] // For folders
    parentId: string | null
    data?: any // Store original record
}

export function PublicRepositoryTree({
    repositoryName,
    folders,
    assets,
    currentFolderId,
    selectedAssetId,
    onSelectFolder,
    onSelectAsset
}: PublicRepositoryTreeProps) {

    const tree = React.useMemo(() => {
        const folderMap = new Map<string, TreeNode>()
        
        // 1. Create Folder Nodes
        folders.forEach(f => {
            folderMap.set(f.id, { 
                id: f.id, 
                name: f.name, 
                type: 'folder', 
                children: [], 
                parentId: f.parentId,
                data: f 
            })
        })

        const roots: TreeNode[] = []

        // 2. Build Folder Hierarchy
        folders.forEach(f => {
            const node = folderMap.get(f.id)!
            if (f.parentId) {
                const parent = folderMap.get(f.parentId)
                if (parent) {
                    parent.children?.push(node)
                } else {
                    roots.push(node)
                }
            } else {
                roots.push(node)
            }
        })

        // 3. Add Assets
        assets.forEach(a => {
            const assetNode: TreeNode = {
                id: a.id,
                name: (a.meta as any)?.name || "Asset",
                type: 'asset',
                parentId: a.folderId,
                data: a
            }

            if (a.folderId) {
                const parent = folderMap.get(a.folderId)
                if (parent) {
                    parent.children?.push(assetNode)
                } else {
                    // Orphaned asset in folder? Treat as root?
                    // Or maybe folder not loaded? Should not happen if data consistent.
                    // Fallback to root if parent missing?
                    roots.push(assetNode)
                }
            } else {
                roots.push(assetNode)
            }
        })

        // 4. Sort
        const sortNodes = (nodes: TreeNode[]) => {
            // Sort: Folders first, then Assets.
            // Within type: Alphabetical (or Order)
            nodes.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'folder' ? -1 : 1
                }
                // Determine order helper?
                // Use Name for now
                return a.name.localeCompare(b.name)
            })
            
            nodes.forEach(n => {
                if (n.children) sortNodes(n.children)
            })
        }
        sortNodes(roots)

        return roots
    }, [folders, assets])

    // State for open folders
    const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set())

    // Auto-expand
    React.useEffect(() => {
        const idsToOpen = new Set<string>()
        
        // Expand to current folder
        if (currentFolderId) {
            let curr = folders.find(f => f.id === currentFolderId)
            while(curr) {
                idsToOpen.add(curr.id)
                if (curr.parentId) idsToOpen.add(curr.parentId)
                curr = curr.parentId ? folders.find(f => f.id === curr?.parentId) : undefined
            }
        }
        
        // Expand to selected asset
        if (selectedAssetId) {
             const asset = assets.find(a => a.id === selectedAssetId)
             if (asset && asset.folderId) {
                 idsToOpen.add(asset.folderId)
                 let curr = folders.find(f => f.id === asset.folderId)
                 while(curr) {
                    idsToOpen.add(curr.id)
                    if (curr.parentId) idsToOpen.add(curr.parentId)
                    curr = curr.parentId ? folders.find(f => f.id === curr?.parentId) : undefined
                }
             }
        }

        if (idsToOpen.size > 0) {
            setOpenFolders(prev => {
                const next = new Set(prev)
                idsToOpen.forEach(id => next.add(id))
                return next
            })
        }
    }, [currentFolderId, selectedAssetId, folders, assets])

    const toggleFolder = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        setOpenFolders(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <div className="flex flex-col gap-0.5 py-2">
            {/* Repository Root */}
            <button
                onClick={() => onSelectFolder(null)}
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-colors w-full text-left",
                    (currentFolderId === null && !selectedAssetId)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
            >
                <Archive className="w-4 h-4 shrink-0" />
                <span className="truncate">{repositoryName}</span>
            </button>

            {/* Tree */}
            <div className="flex flex-col gap-0.5 pl-3">
                {tree.map(node => (
                    <TreeNodeItem 
                        key={node.id} 
                        node={node} 
                        currentFolderId={currentFolderId}
                        selectedAssetId={selectedAssetId}
                        onSelectFolder={onSelectFolder}
                        onSelectAsset={onSelectAsset}
                        openFolders={openFolders}
                        onToggleFolder={toggleFolder}
                    />
                ))}
            </div>
        </div>
    )
}

function TreeNodeItem({ 
    node, 
    currentFolderId, 
    selectedAssetId,
    onSelectFolder, 
    onSelectAsset,
    openFolders,
    onToggleFolder
}: { 
    node: TreeNode, 
    currentFolderId: string | null,
    selectedAssetId?: string | null,
    onSelectFolder: (id: string) => void,
    onSelectAsset?: (asset: AssetRecord) => void,
    openFolders: Set<string>,
    onToggleFolder: (id: string, e?: React.MouseEvent) => void
}) {
    // 1. Folder Render
    if (node.type === 'folder') {
        const hasChildren = node.children && node.children.length > 0
        const isActive = currentFolderId === node.id && !selectedAssetId
        const isOpen = openFolders.has(node.id)

        const handleFolderClick = (e: React.MouseEvent) => {
            e.stopPropagation()
            if (isActive) {
                onToggleFolder(node.id, e)
            } else {
                onSelectFolder(node.id)
            }
        }

        return (
            <Collapsible open={isOpen}>
                 <div 
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-colors w-full group select-none cursor-pointer",
                        isActive 
                             ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                             : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    onClick={handleFolderClick}
                 >
                    {/* Fixed width arrow container for alignment */}
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                         <button
                            onClick={(e) => onToggleFolder(node.id, e)}
                            className={cn(
                                "flex items-center justify-center w-4 h-4 rounded-sm hover:bg-sidebar-accent hover:text-foreground transition-colors",
                                 !hasChildren && "invisible hover:bg-transparent"
                            )}
                        >
                            <ChevronRight className={cn(
                                "w-3 h-3 transition-transform",
                                isOpen && "rotate-90"
                            )} />
                        </button>
                    </div>
                    
                    <FolderIcon className={cn("w-4 h-4 shrink-0 fill-current opacity-70", isActive && "text-blue-500 opacity-100")} />
                    <span className="truncate flex-1">{node.name}</span>
                 </div>
    
                 {hasChildren && (
                     <CollapsibleContent>
                         <div className="pl-4 ml-[11px] border-l border-border/40 flex flex-col gap-0.5 mt-0.5">
                             {node.children!.map(child => (
                                 <TreeNodeItem
                                     key={child.id}
                                     node={child}
                                     currentFolderId={currentFolderId}
                                     selectedAssetId={selectedAssetId}
                                     onSelectFolder={onSelectFolder}
                                     onSelectAsset={onSelectAsset}
                                     openFolders={openFolders}
                                     onToggleFolder={onToggleFolder}
                                 />
                             ))}
                         </div>
                     </CollapsibleContent>
                 )}
            </Collapsible>
        )
    } 
    
    // 2. Asset Render
    else {
        const isSelected = selectedAssetId === node.id
        return (
            <div
                onClick={() => onSelectAsset?.(node.data)}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-colors w-full cursor-pointer", // No extra pl-8 here, relying on structure or adding empty spacer
                    isSelected 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
            >
                {/* Empty container to align with Folder Arrow */}
                <div className="w-4 h-4 shrink-0" />
                <FileImage className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate flex-1">{node.name}</span>
            </div>
        )
    }
}
