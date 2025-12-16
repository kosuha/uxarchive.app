"use client"

import * as React from "react"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"
import { AssetRecord } from "@/lib/repositories/assets"
import { RepositoryFolderSection } from "@/components/repository-folder-section"
import { PublicAssetDetailDialog } from "./public-asset-detail-dialog"
import { PublicRepositoryTree } from "./public-repository-tree"
import { Lock, ChevronRight, PanelLeft } from "lucide-react"
import { PatternsHeader } from "@/components/share/patterns-header"
import { PublicRepositoryHeader } from "./public-repository-header"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

interface PublicRepositoryViewerProps {
    repository: RepositoryRecord
    folders: RepositoryFolderRecord[]
    assets: AssetRecord[]
}

export function PublicRepositoryViewer({ repository, folders, assets }: PublicRepositoryViewerProps) {
    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null)
    const [selectedAsset, setSelectedAsset] = React.useState<AssetRecord | null>(null)
    const [viewerAssets, setViewerAssets] = React.useState<AssetRecord[]>([])
    
    // Desktop Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true)
    // Mobile Sidebar State
    const [isMobileOpen, setIsMobileOpen] = React.useState(false)

    // Current context
    const currentFolder = React.useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId])

    // Breadcrumbs construction
    const breadcrumbs = React.useMemo(() => {
        if (!currentFolderId) return []
        const path = []
        let curr = folders.find(f => f.id === currentFolderId)
        while (curr) {
            path.unshift(curr)
            curr = curr.parentId ? folders.find(f => f.id === curr?.parentId) : undefined
        }
        return path
    }, [currentFolderId, folders])

    // Filter assets for current view logic
    const childFolders = React.useMemo(() => folders.filter(f => {
        if (!currentFolderId) return !f.parentId
        return f.parentId === currentFolderId
    }).sort((a, b) => a.name.localeCompare(b.name)), [folders, currentFolderId])

    // Recursive assets helper
    const getDescendantFolderIds = React.useCallback((rootId: string) => {
        const descendants = new Set<string>()
        const queue = [rootId]
        while (queue.length > 0) {
            const currentId = queue.pop()!
            descendants.add(currentId)
            const children = folders.filter(f => f.parentId === currentId)
            children.forEach(c => queue.push(c.id))
        }
        return descendants
    }, [folders])

    // Relative path helper
    const getRelativeAssetPath = React.useCallback((assetFolderId: string | null, rootFolderId: string | null) => {
        if (!assetFolderId || assetFolderId === rootFolderId) return ""
        const path = []
        let curr = folders.find(f => f.id === assetFolderId)
        while (curr && curr.id !== rootFolderId) {
            path.unshift(curr.name)
            curr = curr.parentId ? folders.find(f => f.id === curr.parentId) : undefined
        }
        return path.join(" / ")
    }, [folders])

    // Handle Asset Click
    const handleAssetClick = (asset: AssetRecord, siblings: AssetRecord[]) => {
        setViewerAssets(siblings)
        setSelectedAsset(asset)
    }

    if (!repository.isPublic) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen">
                <Lock className="w-12 h-12 mb-4 opacity-50" />
                <h1 className="text-xl font-bold">Private Repository</h1>
                <p className="text-muted-foreground">This repository is not public.</p>
             </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
             {/* Top Global Header (UX Archive) */}
             <div className="shrink-0 border-b border-border bg-background z-50">
                <PatternsHeader hideSearch />
             </div>

             <div className="flex flex-1 overflow-hidden m-4">
                {/* Desktop Sidebar */}
                <div 
                    className={cn(
                        "hidden md:flex border border-border bg-card rounded-2xl flex-col transition-all duration-300 ease-in-out shrink-0 w-[260px]",
                        !isSidebarOpen && "w-0 -ml-4 border-0 opacity-0 overflow-hidden p-0"
                    )}
                >
                    <div className="flex-1 overflow-y-auto p-2">
                        <PublicRepositoryTree
                            repositoryName={repository.name}
                            folders={folders}
                            assets={assets}
                            currentFolderId={currentFolderId}
                            selectedAssetId={selectedAsset?.id}
                            onSelectFolder={setCurrentFolderId}
                            onSelectAsset={(asset) => {
                                const siblings = assets
                                    .filter(a => a.folderId === asset.folderId)
                                    .sort((a, b) => a.order - b.order)
                                handleAssetClick(asset, siblings)
                            }}
                        />
                    </div>
                </div>

                {/* Mobile Sidebar (Sheet) */}
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetContent side="left" className="p-0 w-[280px]">
                         <div className="flex flex-col h-full bg-card">
                             <div className="p-4 border-b border-border flex items-center">
                                 <SheetTitle>{repository.name}</SheetTitle>
                             </div>
                             <div className="flex-1 overflow-y-auto p-2">
                                <PublicRepositoryTree
                                    repositoryName={repository.name}
                                    folders={folders}
                                    assets={assets}
                                    currentFolderId={currentFolderId}
                                    selectedAssetId={selectedAsset?.id}
                                    onSelectFolder={(id) => {
                                        setCurrentFolderId(id)
                                        setIsMobileOpen(false)
                                    }}
                                    onSelectAsset={(asset) => {
                                        const siblings = assets
                                            .filter(a => a.folderId === asset.folderId)
                                            .sort((a, b) => a.order - b.order)
                                        handleAssetClick(asset, siblings)
                                        setIsMobileOpen(false)
                                    }}
                                />
                             </div>
                         </div>
                    </SheetContent>
                </Sheet>

                {/* Main Content */}
                <div className="flex flex-col flex-1 min-w-0 bg-[#FAFAFA] dark:bg-[#09090b]">
                    
                    {/* Workspace Header / Breadcrumbs */}
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40 text-sm bg-background/50 backdrop-blur-sm sticky top-0 z-20 shrink-0">
                         <div className="flex items-center gap-2">
                             {/* Desktop Toggle Button */}
                             <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="hidden md:block text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors"
                             >
                                 <PanelLeft className="w-4 h-4" />
                             </button>

                             {/* Mobile Toggle Button */}
                             <button 
                                onClick={() => setIsMobileOpen(true)}
                                className="md:hidden text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors"
                             >
                                 <PanelLeft className="w-4 h-4" />
                             </button>

                             <div className="w-px h-4 bg-border/60 mx-1" />
                         </div>

                         <div className="flex items-center gap-1 text-muted-foreground overflow-x-auto scrollbar-hide flex-1">
                            <button
                                onClick={() => setCurrentFolderId(null)}
                                className={cn(
                                    "hover:text-foreground transition-colors shrink-0",
                                    !currentFolderId && "text-foreground font-medium"
                                )}
                            >
                                {repository.name}
                            </button>
                            {breadcrumbs.map((folder, idx) => (
                                <React.Fragment key={folder.id}>
                                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                                    <button
                                        onClick={() => setCurrentFolderId(folder.id)}
                                        className={cn(
                                            "hover:text-foreground transition-colors truncate max-w-[150px]",
                                            idx === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""
                                        )}
                                    >
                                        {folder.name}
                                    </button>
                                </React.Fragment>
                            ))}
                         </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto p-0">
                         {/* Repository/Folder Header - Public Version */}
                         <PublicRepositoryHeader 
                             repository={repository} 
                             folder={currentFolder} 
                         />

                         <div className="pb-32">
                             {/* 1. Screens (Direct assets of current view) */}
                             <div className="mt-2">
                                 <RepositoryFolderSection
                                     repositoryId={repository.id}
                                     folderId={currentFolderId}
                                     title="Screens"
                                     showIfEmpty={childFolders.length === 0}
                                     assets={assets.filter(a => a.folderId === (currentFolderId || null))}
                                     onAssetClick={handleAssetClick}
                                 />
                             </div>

                             {/* 2. Subfolders */}
                             {childFolders.length > 0 && (
                                <div className="mt-2 border-t border-border/40 pt-6">
                                    <div className="space-y-4">
                                        {childFolders.map(folder => {
                                            const descendantIds = getDescendantFolderIds(folder.id)
                                            const recursiveAssets = assets.filter(a =>
                                                (a.folderId === folder.id) || (a.folderId && descendantIds.has(a.folderId))
                                            ).map(a => ({
                                                ...a,
                                                path: getRelativeAssetPath(a.folderId, folder.id)
                                            }))

                                            return (
                                                <div key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                                    <RepositoryFolderSection
                                                        repositoryId={repository.id}
                                                        folderId={folder.id}
                                                        title={folder.name}
                                                        showIfEmpty={true}
                                                        assets={recursiveAssets}
                                                        onAssetClick={(a, s) => {
                                                            handleAssetClick(a, s)
                                                        }}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                             )}
                         </div>
                    </div>
                </div>
             </div>

             {selectedAsset && (
                  <PublicAssetDetailDialog
                      isOpen={!!selectedAsset}
                      onClose={() => setSelectedAsset(null)}
                      asset={selectedAsset}
                      assets={viewerAssets}
                      onAssetChange={setSelectedAsset}
                      canDownload
                  />
             )}
        </div>
    )
}
