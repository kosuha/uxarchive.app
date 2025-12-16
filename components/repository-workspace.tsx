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

    // Fetch all assets for the current repository
    const { data: assets = [] } = useQuery({
        queryKey: ["assets", selectedRepositoryId, "recursive-all"],
        queryFn: async () => {
            if (!selectedRepositoryId) return []
            return listAssetsAction({ repositoryId: selectedRepositoryId, mode: 'recursive' })
        },
        enabled: !!selectedRepositoryId,
    })

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
                        assets={(() => {
                            // Calculate recursive assets for current view (currentFolderId or Root)
                            if (!currentFolderId) {
                                // Root case: Show all repo assets? Or just orphans + roots?
                                // User says: "Repo assets at top". Usually means direct assets of repo.
                                // BUT: "Repo -> Folder A -> Folder B". "Repo open -> Repo assets top".
                                // If Repo has assets directly, show them.
                                // Recursion? User said "Repo assets at top". Doesn't explicitly say recursive repo assets.
                                // BUT for Folder A, he said "Asset 1, 2 ALL listed".
                                // Let's try recursive for everything to be safe based on "list all assets in folder".
                                // If Root is "No specific folder", it contains everything.
                                // But usually "Screens" section in Root view is for un-foldered assets.
                                // IF we show ALL assets in "Screens", we duplicate what's in "Subfolders".
                                // "Repo -> Folder A".
                                // If "Screens" shows Asset 1 (from Folder A), and "Folder A" section shows Asset 1... Duplicate!

                                // LOGIC:
                                // "Screens" section = Assets belonging DIRECTLY to current view (currentFolderId or null).
                                // "Subfolders" sections = Assets belonging to each child folder RECURSIVELY.

                                // Re-reading user: "Repo assets at top... below that Folder A's assets".
                                // This implies "Screens" = Direct assets only.
                                // "Folder A" section = Recursive assets of A.

                                // So for "Screens" section:
                                return assets.filter(a => a.folderId === (currentFolderId || null)).map(a => ({
                                    ...a,
                                    path: "" // No relative path needed for direct assets
                                }))
                            } else {
                                // If we are IN Folder A.
                                // "Screens" = Direct assets of A?
                                // Or recursive assets of A?
                                // User: "Folder A 에셋1, 2 모두 나열". (Asset 1 in A, Asset 2 in B).
                                // So when inside Folder A: "Screens" should be recursive?
                                // If we are inside Folder A, we see:
                                // 1. Screens (Assets of A + B).
                                // 2. Subfolders (Folder B).
                                // If Screens shows Asset 2 (from B), and Folder B section shows Asset 2... Duplicate!

                                // Maybe "Subfolders" sections shouldn't be shown if "Screens" shows everything?
                                // OR: "Screens" = Direct assets only.
                                // "Subfolders" = Recursive assets of subfolders.
                                // AND we need to show nested content somehow.

                                // User said: "Repo open -> Repo assets top, below Folder A assets".
                                // This is Root View.
                                // Root View:
                                // 1. Screens (Repo direct assets).
                                // 2. Folder A Section (Asset 1, Asset 2).

                                // This confirms:
                                // - Top "Screens" section: Direct assets of current view ONLY.
                                // - Child Folder Sections: Recursive assets of that child folder.

                                return assets.filter(a => a.folderId === currentFolderId).map(a => ({
                                    ...a,
                                    path: ""
                                }))
                            }
                        })()}
                    />
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
                                }))

                                return (
                                    <div key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <RepositoryFolderSection
                                            repositoryId={selectedRepositoryId}
                                            folderId={folder.id}
                                            title={folder.name}
                                            showIfEmpty={true}
                                            assets={recursiveAssets}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
// Icon helper
import { Folder as FoldersIcon } from "lucide-react"
