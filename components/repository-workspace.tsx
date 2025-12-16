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

            <div className="flex-1 overflow-hidden flex flex-col relative bg-[#F5F5F5] dark:bg-zinc-900/50">
                {/* Folders Grid (Root View) */}
                {!currentFolderId && (
                    <div className="p-8 overflow-y-auto h-full">
                        {currentFolders.length > 0 ? (
                            <div>
                                <h3 className="text-sm font-medium mb-4 text-muted-foreground">Flows (Folders)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {currentFolders.map(folder => (
                                        <ItemContextMenu key={folder.id} type="folder" onRename={() => { }} onDelete={() => { }}>
                                            <div
                                                className="group cursor-pointer flex flex-col gap-2"
                                                onClick={() => setCurrentFolderId(folder.id)}
                                            >
                                                <div className="aspect-[4/3] bg-white dark:bg-card border rounded-xl shadow-sm group-hover:shadow-md transition-all flex items-center justify-center">
                                                    <FolderIcon className="w-10 h-10 text-blue-500/80 fill-blue-500/10" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-sm font-medium block truncate pl-1">{folder.name}</span>
                                                    <span className="text-xs text-muted-foreground block pl-1">0 screens</span>
                                                </div>
                                            </div>
                                        </ItemContextMenu>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <FolderIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p>No flows yet. Create a folder to start.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Mobbin-style Horizontal Scroll (Flow View) */}
                {currentFolderId && (
                    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden flex items-center px-[20vw] py-8 snap-x snap-mandatory">
                        {assetsLoading ? (
                            <div className="mx-auto">Loading screens...</div>
                        ) : assets.length === 0 ? (
                            <div className="mx-auto text-muted-foreground border border-dashed p-8 rounded-lg">
                                No screens in this flow
                            </div>
                        ) : (
                            <div className="flex gap-8 lg:gap-12 h-full max-h-[80vh] items-center">
                                {assets.map((asset, index) => (
                                    <ItemContextMenu key={asset.id} type="asset" onRename={() => { }} onDelete={() => { }}>
                                        <div className="relative snap-center shrink-0 h-full flex flex-col gap-3 group">
                                            {/* Screen Card */}
                                            <div className="h-full rounded-[2rem] overflow-hidden border-[6px] border-white dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-800 relative select-none">
                                                {/* Placeholder for Image - Using color block or icon for now */}
                                                <div className="w-[300px] h-[600px] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                                                    <FileImage className="w-12 h-12 text-zinc-300" />
                                                    <span className="absolute bottom-4 text-xs text-zinc-400 font-mono">
                                                        {asset.storagePath.split('/').pop()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Screen Number / Metadata */}
                                            <div className="text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-xs font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded-full border">
                                                    {index + 1}
                                                </span>
                                            </div>
                                        </div>
                                    </ItemContextMenu>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
