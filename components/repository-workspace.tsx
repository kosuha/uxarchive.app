"use client"

import * as React from "react"
import { useRepositoryData } from "@/components/repository-data-context"
import { Upload as UploadIcon, Loader2, FolderPlus, ChevronRight, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { createAssetAction, listAssetsAction } from "@/app/actions/assets"
import { Button } from "@/components/ui/button"
import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client"
import { toast } from "sonner"
import { CreateFolderDialog } from "./create-folder-dialog"
import { RepositoryFolderSection } from "./repository-folder-section"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function RepositoryWorkspace({ className }: { className?: string }) {
    const {
        selectedRepositoryId,
        currentFolderId,
        setCurrentFolderId,
        folders,
        repositories,
    } = useRepositoryData()
    const queryClient = useQueryClient()

    const currentRepository = repositories.find(r => r.id === selectedRepositoryId)
    const currentFolder = folders.find(f => f.id === currentFolderId)

    // Derived state: child folders of current view
    const childFolders = folders.filter(f => {
        if (!currentFolderId) return !f.parentId // Root folders
        return f.parentId === currentFolderId
    }).sort((a, b) => a.order - b.order)

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

    // Load assets for current view (folder or root) to check if empty
    // Actually RepositoryFolderSection does the loading, but for Top Level empty check we might need it.
    // Optimization: Let's trust RepositoryFolderSection to handle loading.

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
        if (fileInputRef.current) fileInputRef.current.value = ""
        queryClient.invalidateQueries({ queryKey: ["assets", selectedRepositoryId] })
    }


    if (!selectedRepositoryId) {
        return <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a repository</div>
    }

    // Title to display in the main header
    const pageTitle = currentFolder ? currentFolder.name : currentRepository?.name

    return (
        <div className={cn("flex flex-col rounded-lg h-full bg-[#FAFAFA] dark:bg-[#09090b]", className)}>

            {/* 1. Global Navigation Bar (Breadcrumbs + Actions) */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 text-sm bg-background/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <div className="w-px h-4 bg-border/60 mx-1" />
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Workspace</span>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                        <button
                            onClick={() => setCurrentFolderId(null)}
                            className={cn(
                                "hover:text-foreground transition-colors",
                                !currentFolderId && "text-foreground font-medium"
                            )}
                        >
                            {currentRepository?.name}
                        </button>
                        {breadcrumbs.map((folder, idx) => (
                            <React.Fragment key={folder.id}>
                                <ChevronRight className="w-4 h-4 opacity-50" />
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

                <div className="flex items-center gap-2">
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
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadIcon className="w-3 h-3" />}
                        {uploading ? "Uploading" : "Upload"}
                    </Button>
                </div>
            </div>

            {/* 2. Main Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-32">

                {/* 1. Current Screens */}
                <div className="mt-2">
                    <RepositoryFolderSection
                        repositoryId={selectedRepositoryId}
                        folderId={currentFolderId}
                        title="Screens"
                        showIfEmpty={childFolders.length === 0}
                    />
                </div>

                {/* 2. Subfolders */}
                {childFolders.length > 0 && (
                    <div className="mt-2 border-t border-border/40 pt-6">
                        <div className="space-y-2">
                            {childFolders.map(folder => (
                                <div key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <RepositoryFolderSection
                                        repositoryId={selectedRepositoryId}
                                        folderId={folder.id}
                                        title={folder.name}
                                        showIfEmpty={true}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
