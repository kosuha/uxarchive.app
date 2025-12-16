"use client"

import * as React from "react"
import { useRepositoryData } from "@/components/repository-data-context"
import { FolderIcon, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"
// import { AssetCard } from "./asset-card" // Need to create or reuse
import { useQuery } from "@tanstack/react-query"
import { listAssetsAction } from "@/app/actions/assets"
import { ItemContextMenu } from "./item-context-menu"

export function RepositoryWorkspace({ className }: { className?: string }) {
    const {
        selectedRepositoryId,
        currentFolderId,
        setCurrentFolderId,
        folders,
        repositories
    } = useRepositoryData()

    const currentRepository = repositories.find(r => r.id === selectedRepositoryId)

    // Derived state: current folders (children of currentFolderId)
    const currentFolders = folders.filter(f => {
        if (!currentFolderId) return !f.parentId // Root folders
        return f.parentId === currentFolderId
    }).sort((a, b) => a.order - b.order)

    // Load assets for current folder
    const { data: assets = [], isLoading: assetsLoading } = useQuery({
        queryKey: ["assets", currentFolderId],
        queryFn: async () => {
            if (!currentFolderId) return [] // No assets in root? or maybe allowed? Assuming assets live in folders.
            return listAssetsAction(currentFolderId)
        },
        enabled: !!currentFolderId
    })

    if (!selectedRepositoryId) {
        return <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a repository</div>
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="border-b p-4 flex items-center gap-2">
                <span className="font-semibold text-lg">{currentRepository?.name}</span>
                {/* Breadcrumbs placeholder */}
                <span className="text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">{currentFolderId ? "..." : "Root"}</span>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {/* Folders Grid */}
                {currentFolders.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Folders</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {currentFolders.map(folder => (
                                <ItemContextMenu key={folder.id} type="folder" onRename={() => { }} onDelete={() => { }}>
                                    <div
                                        className="border rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent/50 transition-colors aspect-[4/3]"
                                        onClick={() => setCurrentFolderId(folder.id)}
                                    >
                                        <FolderIcon className="w-8 h-8 text-blue-400 fill-blue-400/20" />
                                        <span className="text-sm text-center truncate w-full">{folder.name}</span>
                                    </div>
                                </ItemContextMenu>
                            ))}
                        </div>
                    </div>
                )}

                {/* Assets Grid */}
                {currentFolderId && (
                    <div>
                        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Assets</h3>
                        {assetsLoading ? (
                            <div>Loading assets...</div>
                        ) : assets.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
                                No assets in this folder
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {assets.map(asset => (
                                    <ItemContextMenu key={asset.id} type="asset" onRename={() => { }} onDelete={() => { }}>
                                        <div className="border rounded-lg overflow-hidden group">
                                            <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
                                                {/* Placeholder for image */}
                                                {/* Assuming storagePath is relative or full URL? need to resolve */}
                                                {/* For now just icon */}
                                                <FileImage className="w-8 h-8 text-muted-foreground" />
                                                {/* If we have a resolved URL logic, use it here */}
                                            </div>
                                            <div className="p-2 text-xs text-muted-foreground truncate">
                                                {asset.storagePath.split('/').pop()}
                                            </div>
                                        </div>
                                    </ItemContextMenu>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!currentFolderId && currentFolders.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FolderIcon className="w-12 h-12 mb-4 opacity-20" />
                        <p>This repository is empty</p>
                    </div>
                )}
            </div>
        </div>
    )
}
