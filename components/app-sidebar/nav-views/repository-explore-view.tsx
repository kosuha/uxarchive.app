"use client"

import * as React from "react"
import { RepositoryTree } from "../repository-tree"
import { useRepositoryData } from "@/components/repository-data-context"
import { useQueryClient } from "@tanstack/react-query"
import { CreateRepositoryDialog } from "@/components/create-repository-dialog"
import { SnapshotsDialog } from "@/components/snapshots-dialog"
import { deleteRepositoryAction, forkRepositoryAction, moveRepositoryToRepositoryAction, updateRepositoryAction, forkFolderAction } from "@/app/actions/repositories"
import { deleteRepositoryFolderAction, updateRepositoryFolderAction, moveRepositoryFolderAction, copyRepositoryFolderAction } from "@/app/actions/repository-folders"
import { duplicateAssetAction, copyRepositoryAsFolderAction } from "@/app/actions/copy-paste"
import { useToast } from "@/components/ui/use-toast"
import { moveRepositoryAssetAction, deleteRepositoryAssetAction, updateRepositoryAssetAction, reorderAssetsAction } from "@/app/actions/repository-assets"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { AssetDetailDialog } from "@/components/asset-detail-dialog"

// Wrapper to bridge data and logic
export function RepositoryExploreView() {
    const { repositories, folders, assets, selectedRepositoryId, setSelectedRepositoryId, currentFolderId, setCurrentFolderId, refresh, setClipboard, clipboard, workspaceId } = useRepositoryData()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    // ... (rest of the file) ...

    const handleReorderAsset = async (items: { id: string, order: number }[], repositoryId: string) => {
        try {
            // 1. Optimistic Update (Sidebar/Global Cache)
            if (workspaceId) {
                queryClient.setQueryData<any[]>(["assets", "workspace", workspaceId], (oldAssets) => {
                    if (!oldAssets) return oldAssets
                    const updateMap = new Map(items.map(u => [u.id, u.order]))

                    return oldAssets.map(asset => {
                        if (updateMap.has(asset.id)) {
                            return { ...asset, order: updateMap.get(asset.id)! }
                        }
                        return asset
                    })
                })
            }

            // 2. Optimistic Update (Main Workspace Cache)
            queryClient.setQueryData<any[]>(["assets", repositoryId, "recursive-all"], (oldAssets) => {
                if (!oldAssets) return oldAssets
                const updateMap = new Map(items.map(u => [u.id, u.order]))

                return oldAssets.map(asset => {
                    if (updateMap.has(asset.id)) {
                        return { ...asset, order: updateMap.get(asset.id)! }
                    }
                    return asset
                })
            })

            await reorderAssetsAction({ items, repositoryId })
            // Optimized invalidation
            await queryClient.invalidateQueries({ queryKey: ["assets"] })
        } catch (error) {
            console.error("Failed to reorder assets", error)
            toast({ description: "Failed to reorder assets", variant: "destructive" })
            // Revert logic would go here ideally
            queryClient.invalidateQueries({ queryKey: ["assets"] })
        }
    }

    // State for Context Menus and Dialogs
    const [snapshotRepoId, setSnapshotRepoId] = React.useState<string | null>(null)
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
    const [viewingAssetId, setViewingAssetId] = React.useState<string | null>(null)

    // Derived State
    const viewingAsset = React.useMemo(() =>
        assets.find(a => a.id === viewingAssetId) || null
        , [assets, viewingAssetId])

    // Alert Dialog State
    const [alertState, setAlertState] = React.useState<{
        open: boolean
        title: string
        description: string
        action: () => Promise<void>
    }>({
        open: false,
        title: "",
        description: "",
        action: async () => { }
    })

    const closeAlert = () => setAlertState(prev => ({ ...prev, open: false }))

    // Handlers
    const handleDeleteRepository = async (id: string) => {
        const repo = repositories.find(r => r.id === id)
        if (!repo) return

        setAlertState({
            open: true,
            title: "Delete Repository?",
            description: `Are you sure you want to delete "${repo.name}"? This action cannot be undone.`,
            action: async () => {
                await deleteRepositoryAction({ id, workspaceId: repo.workspaceId })
                refresh()
                closeAlert()
            }
        })
    }

    const handleForkRepository = async (repo: any) => {
        // Re-use logic or extract to hook
        const newName = prompt("Fork Name", `${repo.name} (Fork)`)
        if (newName) {
            const result = await forkRepositoryAction({
                sourceRepositoryId: repo.id,
                workspaceId: repo.workspaceId,
                name: newName,
                description: repo.description
            })
            if (result.error) {
                alert(`Failed to fork: ${result.error}`)
            } else {
                refresh()
            }
        }
    }

    const handleForkFolder = async (folder: { id: string, name: string, repositoryId: string }) => {
        const repo = repositories.find(r => r.id === folder.repositoryId)
        if (!repo) return

        const newName = prompt("Fork Folder as Repository", `${folder.name} (Fork)`)
        if (newName) {
            toast({ description: "Forking folder..." })
            try {
                const result = await forkFolderAction({
                    sourceFolderId: folder.id,
                    sourceRepositoryId: folder.repositoryId,
                    workspaceId: repo.workspaceId,
                    name: newName,
                    description: `Forked from folder '${folder.name}' in '${repo.name}'`
                })

                if (result.error) {
                    toast({ description: `Fork failed: ${result.error}`, variant: "destructive" })
                } else {
                    toast({ description: "Folder forked successfully" })
                    refresh()
                }
            } catch (e: any) {
                console.error("Fork folder failed", e)
                toast({ description: `Fork failed: ${e.message}`, variant: "destructive" })
            }
        }
    }

    const handleRenameRepository = async (id: string, newName: string) => {
        const repo = repositories.find(r => r.id === id)
        if (!repo) return

        await updateRepositoryAction({
            id,
            workspaceId: repo.workspaceId,
            name: newName
        })
        refresh()
    }

    const handleDeleteFolder = async (id: string, repositoryId: string) => {
        // Find folder name for better UX
        const folder = folders.find(f => f.id === id)
        const folderName = folder ? folder.name : "Folder"

        setAlertState({
            open: true,
            title: "Delete Folder?",
            description: `Are you sure you want to delete "${folderName}" and all its contents? This cannot be undone.`,
            action: async () => {
                await deleteRepositoryFolderAction({ id, repositoryId })
                refresh()
                closeAlert()
            }
        })
    }

    const handleRenameFolder = async (id: string, newName: string, repositoryId: string) => {
        // Optimistic Update
        if (workspaceId) {
            queryClient.setQueryData<any[]>(["repository-folders", "workspace", workspaceId], (old) => {
                if (!old) return old
                return old.map(f => f.id === id ? { ...f, name: newName } : f)
            })
        }

        await updateRepositoryFolderAction({ id, repositoryId, name: newName })
        queryClient.invalidateQueries({ queryKey: ["repository-folders"] })
    }

    const handleMoveFolder = async (id: string, newParentId: string | null, repositoryId: string) => {
        try {
            // Optimistic Update
            if (workspaceId) {
                queryClient.setQueryData<any[]>(["repository-folders", "workspace", workspaceId], (old) => {
                    if (!old) return old
                    return old.map(f => f.id === id ? { ...f, parentId: newParentId } : f)
                })
            }

            await moveRepositoryFolderAction({ id, repositoryId, newParentId })
            queryClient.invalidateQueries({ queryKey: ["repository-folders"] })
        } catch (error) {
            console.error("Failed to move folder", error)
            alert("Failed to move folder")
            queryClient.invalidateQueries({ queryKey: ["repository-folders"] }) // Revert on error
        }
    }

    const handleMoveAsset = async (id: string, newFolderId: string | null, repositoryId: string) => {
        try {
            // Optimistic Update
            if (workspaceId) {
                queryClient.setQueryData<any[]>(["assets", "workspace", workspaceId], (old) => {
                    if (!old) return old
                    return old.map(a => a.id === id ? { ...a, folderId: newFolderId } : a)
                })
            }

            await moveRepositoryAssetAction({ id, repositoryId, newFolderId })
            queryClient.invalidateQueries({ queryKey: ["assets"] })
        } catch (error) {
            console.error("Failed to move asset", error)
            alert("Failed to move asset")
            queryClient.invalidateQueries({ queryKey: ["assets"] }) // Revert on error
        }
    }

    const handleRenameAsset = async (id: string, newName: string, repositoryId: string) => {
        const asset = assets.find(a => a.id === id)
        const meta = (asset?.meta as any) || {}
        const newMeta = { ...meta, name: newName }

        // Optimistic Update
        if (workspaceId) {
            queryClient.setQueryData<any[]>(["assets", "workspace", workspaceId], (old) => {
                if (!old) return old
                return old.map(a => a.id === id ? { ...a, meta: newMeta } : a)
            })
        }

        await updateRepositoryAssetAction({ id, repositoryId, meta: newMeta })
        queryClient.invalidateQueries({ queryKey: ["assets"] })
    }

    const handleDeleteAsset = async (id: string, repositoryId: string) => {
        setAlertState({
            open: true,
            title: "Delete Asset?",
            description: "Are you sure you want to permanently delete this asset? This cannot be undone.",
            action: async () => {
                await deleteRepositoryAssetAction({ id, repositoryId })
                refresh()
                closeAlert()
            }
        })
    }

    const handleSelectAsset = (asset: any) => {
        setViewingAssetId(asset.id)
    }

    const handleMoveRepository = async (sourceId: string, targetId: string, targetFolderId?: string | null) => {
        try {
            await moveRepositoryToRepositoryAction({ sourceRepositoryId: sourceId, targetRepositoryId: targetId, targetFolderId })
            refresh()
        } catch (error) {
            console.error("Failed to move repository", error)
            alert("Failed to move repository: " + (error as Error).message)
        }
    }


    // Filter assets for navigation (siblings in same folder/repo)
    const viewingAssetSiblings = React.useMemo(() => {
        if (!viewingAsset) return []
        return assets.filter(a =>
            a.repositoryId === viewingAsset.repositoryId &&
            a.folderId === viewingAsset.folderId
        ).sort((a, b) => a.order - b.order)
    }, [viewingAsset, assets])

    const handleCopyAsset = (assetId: string, repositoryId: string) => {
        setClipboard({ type: 'asset', id: assetId, repositoryId })
        toast({ description: "Copied asset" })
    }

    const handleCopyFolder = (folderId: string, repositoryId: string) => {
        setClipboard({ type: 'folder', id: folderId, repositoryId })
        toast({ description: "Copied folder" })
    }

    const handlePasteToFolder = async (folderId: string, repositoryId: string) => {
        if (!clipboard) return

        try {
            if (clipboard.type === 'asset') {
                toast({ description: "Pasting asset..." })
                await duplicateAssetAction({
                    assetId: clipboard.id,
                    targetRepositoryId: repositoryId,
                    targetFolderId: folderId
                })
                toast({ description: "Asset pasted" })
            } else if (clipboard.type === 'folder') {
                toast({ description: "Pasting folder..." })
                await copyRepositoryFolderAction({
                    sourceFolderId: clipboard.id,
                    sourceRepositoryId: clipboard.repositoryId,
                    targetRepositoryId: repositoryId,
                    targetParentId: folderId
                })
                toast({ description: "Folder pasted" })
            } else if (clipboard.type === 'repository') {
                toast({ description: "Pasting repository as folder..." })
                try {
                    await copyRepositoryAsFolderAction({
                        sourceRepositoryId: clipboard.id,
                        targetRepositoryId: repositoryId,
                        targetParentId: folderId
                    })
                    toast({ description: "Repository pasted as folder" })
                } catch (e: any) {
                    console.error("Paste failed", e)
                    toast({ description: `Paste failed: ${e.message || "Unknown error"}`, variant: "destructive" })
                }
            }
            await refresh()
        } catch (e) {
            console.error("Paste failed", e)
            toast({ description: "Failed to paste", variant: "destructive" })
        }
    }

    const handleCopyRepository = (repositoryId: string) => {
        setClipboard({ type: 'repository', id: repositoryId, repositoryId: repositoryId })
        toast({ description: "Copied repository" })
    }

    const handlePasteToRepository = async (targetRepoId: string) => {
        if (!clipboard) return

        try {
            if (clipboard.type === 'repository') {
                // Paste Repository -> Converts to Folder in Target Repository
                toast({ description: "Pasting repository..." })
                try {
                    await copyRepositoryAsFolderAction({
                        sourceRepositoryId: clipboard.id,
                        targetRepositoryId: targetRepoId,
                        targetParentId: null // Root of target repo
                    })
                    toast({ description: "Repository pasted as folder" })
                } catch (e: any) {
                    console.error("Paste failed", e)
                    toast({ description: `Paste failed: ${e.message || "Unknown error"}`, variant: "destructive" })
                }
            } else if (clipboard.type === 'asset') {
                // Paste Asset into Repository Root
                toast({ description: "Pasting asset..." })
                await duplicateAssetAction({
                    assetId: clipboard.id,
                    targetRepositoryId: targetRepoId,
                    targetFolderId: null // Root
                })
                toast({ description: "Asset pasted" })
            } else if (clipboard.type === 'folder') {
                // Paste Folder into Repository Root
                toast({ description: "Pasting folder..." })
                await copyRepositoryFolderAction({
                    sourceFolderId: clipboard.id,
                    sourceRepositoryId: clipboard.repositoryId,
                    targetRepositoryId: targetRepoId,
                    targetParentId: null // Root
                })
                toast({ description: "Folder pasted" })
            }
            await refresh()
        } catch (e) {
            console.error("Paste failed", e)
            toast({ description: "Failed to paste", variant: "destructive" })
        }
    }

    return (
        <div className="flex flex-col flex-1 h-full">
            <RepositoryTree
                repositories={repositories}
                folders={folders}
                assets={assets}
                selectedRepositoryId={selectedRepositoryId}
                selectedFolderId={currentFolderId}
                onSelectRepository={(id: string) => {
                    setSelectedRepositoryId(id)
                    setCurrentFolderId(null) // Reset folder when repo changes
                }}
                onSelectFolder={(id: string) => setCurrentFolderId(id)}
                onCreateRepository={() => setCreateDialogOpen(true)}
                onForkRepository={handleForkRepository}
                onForkFolder={handleForkFolder}
                onSnapshotRepository={setSnapshotRepoId}
                onDeleteRepository={handleDeleteRepository}
                onRenameRepository={handleRenameRepository}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onMoveFolder={handleMoveFolder}
                onMoveAsset={handleMoveAsset}
                onReorderAsset={handleReorderAsset}
                onDeleteAsset={handleDeleteAsset}
                onRenameAsset={handleRenameAsset}
                onSelectAsset={handleSelectAsset}
                onMoveRepository={handleMoveRepository}
                onCopyAsset={handleCopyAsset}
                onCopyFolder={handleCopyFolder}
                onPasteToFolder={handlePasteToFolder}
                onCopyRepository={handleCopyRepository}
                onPasteToRepository={handlePasteToRepository}
                isClipboardEmpty={!clipboard}
            />

            {/* Dialogs */}
            <CreateRepositoryDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

            {snapshotRepoId && (
                <SnapshotsDialog
                    repositoryId={snapshotRepoId}
                    open={!!snapshotRepoId}
                    onOpenChange={(open: boolean) => !open && setSnapshotRepoId(null)}
                />
            )}

            <AlertDialog open={alertState.open} onOpenChange={(open) => !open && closeAlert()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertState.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertState.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={alertState.action} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {viewingAsset && (
                <AssetDetailDialog
                    isOpen={!!viewingAsset}
                    onClose={() => setViewingAssetId(null)}
                    asset={viewingAsset}
                    repositoryId={viewingAsset.repositoryId || ""}
                    assets={viewingAssetSiblings}
                    onAssetChange={(asset) => setViewingAssetId(asset.id)}
                />
            )}
        </div>
    )
}
