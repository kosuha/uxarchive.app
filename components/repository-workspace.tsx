"use client"

import * as React from "react"
import { useRepositoryData } from "@/components/repository-data-context"
import { FolderIcon, FileImage, Upload as UploadIcon, Loader2, FolderPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateFolderDialog } from "./create-folder-dialog"
// import { AssetCard } from "./asset-card" // Need to create or reuse
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { listAssetsAction, createAssetAction } from "@/app/actions/assets"
import { ItemContextMenu } from "./item-context-menu"
import { Button } from "@/components/ui/button"
import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client"
import { toast } from "sonner"

export function RepositoryWorkspace({ className }: { className?: string }) {
    const {
        selectedRepositoryId,
        currentFolderId,
        setCurrentFolderId,
        folders,
        repositories,
        refresh
    } = useRepositoryData()
    const queryClient = useQueryClient()

    const currentRepository = repositories.find(r => r.id === selectedRepositoryId)

    // Derived state: current folders (children of currentFolderId)
    const currentFolders = folders.filter(f => {
        if (!currentFolderId) return !f.parentId // Root folders
        return f.parentId === currentFolderId
    }).sort((a, b) => a.order - b.order)

    // Load assets for current view (folder or root)
    const { data: assets = [], isLoading: assetsLoading } = useQuery({
        queryKey: ["assets", selectedRepositoryId, currentFolderId],
        queryFn: async () => {
            if (!selectedRepositoryId) return []
            return listAssetsAction({
                repositoryId: selectedRepositoryId,
                folderId: currentFolderId
            })
        },
        enabled: !!selectedRepositoryId
    })

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
                // Path strategy: assets/{uuid}/{filename}
                const assetId = crypto.randomUUID()
                // Sanitize filename
                const ext = file.name.split('.').pop()
                const storagePath = `assets/${assetId}.${ext}`

                const { error: uploadError } = await supabase.storage
                    .from("ux-archive-captures") // Using legacy bucket as planned
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
                console.error("Upload failed for", file.name, error)
                return { status: 'rejected', name: file.name }
            }
        })

        const results = await Promise.all(uploadPromises)
        const failed = results.filter(r => r.status === 'rejected')

        if (failed.length > 0) {
            toast.error(`Failed to upload ${failed.length} images`)
        } else {
            toast.success(`Uploaded ${results.length} images`)
        }

        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = "" // Reset

        // Refresh assets
        queryClient.invalidateQueries({ queryKey: ["assets", selectedRepositoryId, currentFolderId] })
    }

    if (!selectedRepositoryId) {
        return <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a repository</div>
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="border-b p-4 flex items-center justify-between gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{currentRepository?.name}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">{currentFolderId ? "..." : "Root"}</span>
                </div>

                {/* Actions - Always enabled if repository selected */}
                <div className="flex items-center gap-2">
                    <CreateFolderDialog
                        repositoryId={selectedRepositoryId}
                        parentId={currentFolderId || null}
                        trigger={
                            <Button variant="outline" size="sm" className="gap-2">
                                <FolderPlus className="w-4 h-4" />
                                New Folder
                            </Button>
                        }
                    />
                    <div className="w-px h-6 bg-border mx-1" /> {/* Divider */}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
                        {uploading ? "Uploading..." : "Upload Screens"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative bg-[#F5F5F5] dark:bg-zinc-900/50">
                {/* Folders Grid (Root View) */}
                {!currentFolderId && (
                    <div className="p-8 overflow-y-auto h-full space-y-8">
                        {currentFolders.length > 0 && (
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
                        )}

                        {/* Root Assets (if any) */}
                        {assets.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium mb-4 text-muted-foreground">Screens (Root)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {assets.map(asset => (
                                        <ItemContextMenu key={asset.id} type="asset" onRename={() => { }} onDelete={() => { }}>
                                            <div className="group flex flex-col gap-2">
                                                <div className="aspect-[9/16] bg-white dark:bg-card border rounded-xl shadow-sm group-hover:shadow-md transition-all overflow-hidden relative">
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`}
                                                        alt="Screen"
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            </div>
                                        </ItemContextMenu>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentFolders.length === 0 && assets.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[50vh]">
                                <FolderIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p>This repository is empty</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Mobbin-style Horizontal Scroll (Flow View) */}
                {currentFolderId && (
                    <div className="absolute inset-0 overflow-x-auto overflow-y-hidden flex items-center px-[20vw] py-8 snap-x snap-mandatory">
                        {assetsLoading && !uploading ? (
                            <div className="mx-auto">Loading screens...</div>
                        ) : assets.length === 0 && !uploading ? (
                            <div className="mx-auto text-muted-foreground border border-dashed p-8 rounded-lg">
                                No screens in this flow. <br /> Click "Upload Screens" to add.
                            </div>
                        ) : (
                            <div className="flex gap-8 lg:gap-12 h-full max-h-[80vh] items-center">
                                {assets.map((asset, index) => (
                                    <ItemContextMenu key={asset.id} type="asset" onRename={() => { }} onDelete={() => { }}>
                                        <div className="relative snap-center shrink-0 h-full flex flex-col gap-3 group">
                                            {/* Screen Card */}
                                            <div className="h-full rounded-[2rem] overflow-hidden border-[6px] border-white dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-800 relative select-none">
                                                {/* Image Display */}
                                                <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center relative">
                                                    {/* We need public URL! */}
                                                    {/* Since usage is storagePath, we usually need Signed URL or Public URL. */}
                                                    {/* Assuming Public Bucket for 'ux-archive-captures' or we use a transform to get view URL. */}
                                                    {/* For now, I'll use a placeholder logic to construct URL: */}
                                                    {/* process.env.NEXT_PUBLIC_SUPABASE_URL + /storage/v1/object/public/ux-archive-captures/ + storagePath */}
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`}
                                                        alt="Screen"
                                                        className="w-full h-full object-contain"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            // Fallback
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden')
                                                        }}
                                                    />
                                                    <div className="fallback-icon hidden absolute inset-0 flex items-center justify-center">
                                                        <FileImage className="w-12 h-12 text-zinc-300" />
                                                        <span className="absolute bottom-4 text-xs text-zinc-400 font-mono">
                                                            {asset.storagePath.split('/').pop()}
                                                        </span>
                                                    </div>
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
                                {uploading && (
                                    <div className="relative snap-center shrink-0 h-full flex items-center justify-center w-[200px]">
                                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
