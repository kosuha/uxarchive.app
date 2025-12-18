"use client"

import * as React from "react"
import { useRepositoryData } from "@/components/repository-data-context"
import { Folder, Upload, Plus, File, Trash2, ArrowLeft, MoreHorizontal, ArrowUp, ChevronRight, Loader2, FolderPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { createAssetAction, listAssetsAction } from "@/app/actions/assets"
import { Button } from "@/components/ui/button"
import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client"
import { useToast } from "@/components/ui/use-toast"
import { CreateFolderDialog } from "./create-folder-dialog"
import { RepositoryFolderSection } from "./repository-folder-section"
import { AssetDetailDialog } from "@/components/asset-detail-dialog"
import type { AssetRecord } from "@/lib/repositories/assets"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RepositoryHeader } from "./repository-header"
import { ItemContextMenu } from "./item-context-menu"
import { duplicateAssetAction } from "@/app/actions/copy-paste"
import { copyRepositoryFolderAction, deleteRepositoryFolderAction } from "@/app/actions/repository-folders"
import { reorderAssetsAction } from "@/app/actions/repository-assets"
import { AssetGrid } from "@/components/asset-grid"

export function RepositoryWorkspace({ className }: { className?: string }) {
    const {
        selectedRepositoryId,
        currentFolderId,
        setCurrentFolderId,
        folders,
        repositories,
        clipboard,
        setClipboard,
        refresh,
        workspaceId
    } = useRepositoryData()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const currentRepository = repositories.find(r => r.id === selectedRepositoryId)
    const currentFolder = folders.find(f => f.id === currentFolderId)

    // Paste Handler
    const handlePaste = async (targetFolderId: string | null) => {
        if (!clipboard || !selectedRepositoryId) return

        const { id: pasteToastId, update } = toast({ description: "Pasting from clipboard...", duration: 99999 }) // Keep toast open
        try {
            if (clipboard.type === 'asset') {
                await duplicateAssetAction({
                    assetId: clipboard.id,
                    targetRepositoryId: selectedRepositoryId,
                    targetFolderId
                })
            } else if (clipboard.type === 'folder') {
                await copyRepositoryFolderAction({
                    sourceFolderId: clipboard.id,
                    sourceRepositoryId: clipboard.repositoryId,
                    targetRepositoryId: selectedRepositoryId,
                    targetParentId: targetFolderId
                })
            }
            update({ description: "Pasted successfully", duration: 3000, id: pasteToastId })
            await refresh()
        } catch (e) {
            console.error("Paste failed", e)
            update({ description: "Failed to paste", variant: "destructive", duration: 3000, id: pasteToastId })
        }
    }


    // Fetch all assets for the current repository
    // Fetch all assets for the current repository
    const { data: queryAssets } = useQuery({
        queryKey: ["assets", selectedRepositoryId, "recursive-all"],
        queryFn: async () => {
            if (!selectedRepositoryId) return []
            return listAssetsAction({ repositoryId: selectedRepositoryId, mode: 'recursive' })
        },
        enabled: !!selectedRepositoryId,
    })

    const assets = React.useMemo(() => queryAssets || [], [queryAssets])

    // Derived state: child folders of current view
    const childFolders = folders.filter(f => {
        if (f.repositoryId !== selectedRepositoryId) return false
        if (!currentFolderId) return !f.parentId // Root folders
        return f.parentId === currentFolderId
    }).sort((a, b) => a.order - b.order)

    // Filter relevant assets for the current view (root or specific folder)
    const currentViewAssets = React.useMemo(() => {
        return assets.filter(a => {
            if (currentFolderId) return a.folderId === currentFolderId
            return !a.folderId // Root assets
        }).sort((a, b) => a.order - b.order)
    }, [assets, currentFolderId])

    // Local state for optimistic reordering
    const [optimisticAssets, setOptimisticAssets] = React.useState<AssetRecord[]>([])

    // Sync optimistic state when data source changes
    React.useEffect(() => {
        setOptimisticAssets(currentViewAssets)
    }, [currentViewAssets])

    const handleReorder = async (newOrderAssets: AssetRecord[]) => {
        if (!selectedRepositoryId) return

        // 1. Optimistic Update (Local Grid)
        setOptimisticAssets(newOrderAssets)

        // 2. Prepare payload
        const updates = newOrderAssets.map((asset, index) => ({
            id: asset.id,
            order: index
        }))

        // 3. Optimistic Update (Sidebar/Global Cache)
        if (workspaceId) {
            queryClient.setQueryData<AssetRecord[]>(["assets", "workspace", workspaceId], (oldAssets) => {
                if (!oldAssets) return oldAssets
                const updateMap = new Map(updates.map(u => [u.id, u.order]))

                return oldAssets.map(asset => {
                    if (updateMap.has(asset.id)) {
                        return { ...asset, order: updateMap.get(asset.id)! }
                    }
                    return asset
                })
            })
        }

        // 4. Optimistic Update (Current Repository Cache - Explicit)
        queryClient.setQueryData<AssetRecord[]>(["assets", selectedRepositoryId, "recursive-all"], (oldAssets) => {
            if (!oldAssets) return oldAssets
            const updateMap = new Map(updates.map(u => [u.id, u.order]))

            return oldAssets.map(asset => {
                if (updateMap.has(asset.id)) {
                    return { ...asset, order: updateMap.get(asset.id)! }
                }
                return asset
            })
        })

        // 5. Call Server Action
        try {
            await reorderAssetsAction({ items: updates, repositoryId: selectedRepositoryId })
            // Invalidate to ensure consistency, but user sees update immediately
            queryClient.invalidateQueries({ queryKey: ["assets"] })
        } catch (error) {
            console.error("Failed to reorder assets", error)
            toast({ description: "Failed to save new order", variant: "destructive" })
            queryClient.invalidateQueries({ queryKey: ["assets"] }) // Revert
        }
    }

    // Viewing Asset State
    const [viewingContext, setViewingContext] = React.useState<{ asset: AssetRecord, siblings: AssetRecord[] } | null>(null)

    const handleAssetClick = (asset: AssetRecord, siblings: AssetRecord[]) => {
        setViewingContext({ asset, siblings })
    }

    // Breadcrumb Navigation construction
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


    // 1. Helper to get all descendant folder IDs for a given root folder
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

    // 2. Helper to get asset path relative to a root folder
    const getRelativeAssetPath = React.useCallback((assetFolderId: string | null, rootFolderId: string | null) => {
        if (!assetFolderId || assetFolderId === rootFolderId) return "" // Root of section

        const path = []
        let curr = folders.find(f => f.id === assetFolderId)
        while (curr && curr.id !== rootFolderId) {
            path.unshift(curr.name)
            curr = curr.parentId ? folders.find(f => f.id === curr?.parentId) : undefined
        }
        return path.join(" / ")
    }, [folders])


    // Upload Logic
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = React.useState(false)

    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0 || !selectedRepositoryId) return

        setUploading(true)
        const supabase = getBrowserSupabaseClient()
        const uploadPromises = Array.from(files).map(async (file) => {
            try {
                // 1. Get Image Dimensions
                const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
                    const img = new Image()
                    img.onload = () => resolve({ width: img.width, height: img.height })
                    img.onerror = reject
                    img.src = URL.createObjectURL(file)
                })

                // 2. Upload to Supabase Storage
                const assetId = crypto.randomUUID()
                const ext = file.name.split('.').pop()
                const storagePath = `assets/${assetId}.${ext}`

                const { error: uploadError } = await supabase.storage
                    .from("ux-archive-captures")
                    .upload(storagePath, file)

                if (uploadError) throw uploadError

                // 3. Create DB Record
                await createAssetAction({
                    repositoryId: selectedRepositoryId,
                    folderId: currentFolderId || null,
                    storagePath,
                    width: dimensions.width,
                    height: dimensions.height,
                    meta: { name: file.name }
                })
                return { status: 'fulfilled', name: file.name }
            } catch (error) {
                console.error("Upload failed", error); return { status: 'rejected', name: file.name }
            }
        })

        const results = await Promise.all(uploadPromises)
        const failed = results.filter(r => r.status === 'rejected')

        if (failed.length > 0) {
            toast({ description: `Failed to upload ${failed.length} images`, variant: "destructive" })
        } else {
            toast({ description: `Uploaded ${results.length} images` })
        }

        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
        await refresh()
    }


    if (!selectedRepositoryId) {
        return <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a repository</div>
    }

    // Title to display in the main header
    const pageTitle = currentFolder ? currentFolder.name : currentRepository?.name

    return (
        <div className={cn("flex flex-col rounded-lg h-full bg-background", className)}>

            {/* 1. Global Navigation Bar (Breadcrumbs + Actions) */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40 text-sm bg-background/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                    <SidebarTrigger className="-ml-1 shrink-0" />
                    <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
                    <div
                        className="flex items-center gap-1 text-muted-foreground overflow-x-auto scrollbar-hide min-w-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <span className="shrink-0">Workspace</span>
                        <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                        <button
                            onClick={() => setCurrentFolderId(null)}
                            className={cn(
                                "hover:text-foreground transition-colors shrink-0",
                                !currentFolderId && "text-foreground font-medium"
                            )}
                        >
                            {currentRepository?.name}
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

                <div className="flex items-center gap-2 shrink-0">
                    <CreateFolderDialog
                        repositoryId={selectedRepositoryId}
                        parentId={currentFolderId || null}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <FolderPlus className="w-4 h-4" />
                            </Button>
                        }
                    />

                    <div className="w-px h-4 bg-border/60 mx-1" />

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <Button
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="bg-[#4ADE80] hover:bg-[#22c55e] text-black font-medium gap-2 rounded-full px-4 h-8 text-xs shadow-none"
                    >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {uploading ? "Uploading" : "Upload"}
                    </Button>
                </div>
            </div>

            {/* 2. Main Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-32">

                {/* Repository Header (Always visible) */}
                {currentRepository && (
                    <RepositoryHeader
                        repository={currentRepository}
                        folder={currentFolder}
                    />
                )}

                {/* 1. Current Screens (Grid View + Sortable) */}
                <div className="mt-6">
                    <div className="flex items-baseline gap-2 px-8 mb-4">
                        <h3 className="text-sm font-semibold text-foreground/80">Screens</h3>
                        <span className="text-xs text-muted-foreground">{optimisticAssets.length} items</span>
                    </div>

                    {optimisticAssets.length === 0 ? (
                        <div className="px-8 pb-8">
                            <div className="w-full flex items-center justify-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm h-[200px]">
                                No assets in this folder
                            </div>
                        </div>
                    ) : (
                        <AssetGrid
                            assets={optimisticAssets}
                            repositoryId={selectedRepositoryId}
                            onReorder={handleReorder}
                            onAssetClick={(asset) => handleAssetClick(asset, optimisticAssets)}
                            onCopyAsset={(asset) => {
                                if (setClipboard) {
                                    setClipboard({ type: 'asset', id: asset.id, repositoryId: selectedRepositoryId })
                                    toast({ description: "Copied asset to clipboard" })
                                }
                            }}
                        />
                    )}
                </div>

                {/* 2. Subfolders */}
                {childFolders.length > 0 && (
                    <div className="mt-2 border-t border-border/40 pt-6">
                        <div className="space-y-2">
                            {childFolders.map(folder => {
                                // Calculate ALL recursive assets for this folder
                                const descendantIds = getDescendantFolderIds(folder.id)
                                // recursiveAssets: Assets in 'folder' (direct) OR in any of its descendants.
                                const recursiveAssets = assets.filter(a =>
                                    (a.folderId === folder.id) || (a.folderId && descendantIds.has(a.folderId))
                                ).map(a => ({
                                    ...a,
                                    path: getRelativeAssetPath(a.folderId, folder.id)
                                })).sort((a, b) => {
                                    // Prioritize direct children (where folderId matches the current folder.id)
                                    const aIsDirect = a.folderId === folder.id
                                    const bIsDirect = b.folderId === folder.id

                                    if (aIsDirect && !bIsDirect) return -1
                                    if (!aIsDirect && bIsDirect) return 1

                                    // Secondary sort: Keep original order (defined by 'order' field)
                                    return (a.order || 0) - (b.order || 0)
                                })

                                return (
                                    <ItemContextMenu
                                        key={folder.id}
                                        type="folder"
                                        onCopy={() => {
                                            setClipboard({ type: 'folder', id: folder.id, repositoryId: folder.repositoryId })
                                            toast({ description: "Copied folder to clipboard" })
                                        }}
                                        onPaste={clipboard ? () => handlePaste(folder.id) : undefined}
                                        onDelete={async () => {
                                            if (confirm(`Are you sure you want to delete folder ${folder.name}?`)) {
                                                await deleteRepositoryFolderAction({ id: folder.id, repositoryId: folder.repositoryId })
                                                toast({ description: "Folder deleted" })
                                                refresh()
                                            }
                                        }}
                                    >
                                        <div onClick={() => setCurrentFolderId(folder.id)} className="cursor-pointer hover:bg-muted transition-colors rounded-lg">
                                            <RepositoryFolderSection
                                                repositoryId={selectedRepositoryId}
                                                folderId={folder.id}
                                                title={folder.name}
                                                showIfEmpty={true}
                                                assets={recursiveAssets}
                                                onAssetClick={handleAssetClick}
                                            />
                                        </div>
                                    </ItemContextMenu>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {viewingContext && (
                <AssetDetailDialog
                    isOpen={!!viewingContext}
                    onClose={() => setViewingContext(null)}
                    asset={viewingContext.asset}
                    repositoryId={selectedRepositoryId || ""}
                    assets={viewingContext.siblings}
                    onAssetChange={(asset) => setViewingContext(prev => prev ? { ...prev, asset } : null)}
                />
            )}
        </div>
    )
}
// Icon helper
import { Folder as FoldersIcon } from "lucide-react"
