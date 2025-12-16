"use client"

import * as React from "react"
import { RepositoryTree } from "../repository-tree"
import { useRepositoryData } from "@/components/repository-data-context"
import { CreateRepositoryDialog } from "@/components/create-repository-dialog"
import { SnapshotsDialog } from "@/components/snapshots-dialog"
import { deleteRepositoryAction, forkRepositoryAction, moveRepositoryToRepositoryAction, updateRepositoryAction } from "@/app/actions/repositories"
import { deleteRepositoryFolderAction, updateRepositoryFolderAction, moveRepositoryFolderAction, copyRepositoryFolderAction } from "@/app/actions/repository-folders"
import { duplicateAssetAction } from "@/app/actions/copy-paste"
import { toast } from "sonner"
import { moveRepositoryAssetAction, deleteRepositoryAssetAction, updateRepositoryAssetAction } from "@/app/actions/repository-assets"
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
    const { repositories, folders, assets, selectedRepositoryId, setSelectedRepositoryId, currentFolderId, setCurrentFolderId, refresh, setClipboard, clipboard } = useRepositoryData()

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
            await forkRepositoryAction({
                sourceRepositoryId: repo.id,
                workspaceId: repo.workspaceId,
                name: newName,
                description: repo.description
            })
            refresh()
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
        console.log("handleRenameFolder called", { id, newName, repositoryId })
        await updateRepositoryFolderAction({ id, repositoryId, name: newName })
        refresh()
    }

    const handleMoveFolder = async (id: string, newParentId: string | null, repositoryId: string) => {
        console.log("handleMoveFolder called", { id, newParentId, repositoryId })
        try {
            await moveRepositoryFolderAction({ id, repositoryId, newParentId })
            refresh()
        } catch (error) {
            console.error("Failed to move folder", error)
            alert("Failed to move folder")
        }
    }

    const handleMoveAsset = async (id: string, newFolderId: string | null, repositoryId: string) => {
        try {
            await moveRepositoryAssetAction({ id, repositoryId, newFolderId })
            refresh()
        } catch (error) {
            console.error("Failed to move asset", error)
            alert("Failed to move asset")
        }
    }


    const handleRenameAsset = async (id: string, newName: string, repositoryId: string) => {
        console.log("handleRenameAsset called", { id, newName, repositoryId })
        const asset = assets.find(a => a.id === id)
        const meta = (asset?.meta as any) || {}
        const newMeta = { ...meta, name: newName }

        await updateRepositoryAssetAction({ id, repositoryId, meta: newMeta })
        refresh()
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
        toast.success("Copied asset")
    }

    const handleCopyFolder = (folderId: string, repositoryId: string) => {
        setClipboard({ type: 'folder', id: folderId, repositoryId })
        toast.success("Copied folder")
    }

    const handlePasteToFolder = async (folderId: string, repositoryId: string) => {
        if (!clipboard) return

        try {
             if (clipboard.type === 'asset') {
                toast.promise(duplicateAssetAction({
                    assetId: clipboard.id,
                    targetRepositoryId: repositoryId,
                    targetFolderId: folderId
                }), {
                    loading: "Pasting asset...",
                    success: "Asset pasted",
                    error: "Failed to paste asset"
                })
            } else if (clipboard.type === 'folder') {
                toast.promise(copyRepositoryFolderAction({
                    sourceFolderId: clipboard.id,
                    sourceRepositoryId: clipboard.repositoryId,
                    targetRepositoryId: repositoryId,
                    targetParentId: folderId
                }), {
                    loading: "Pasting folder...",
                    success: "Folder pasted",
                    error: "Failed to paste folder"
                })
            }
            await refresh()
        } catch (e) {
            console.error("Paste failed", e)
            toast.error("Failed to paste")
        }
    }

    const handleCopyRepository = (repositoryId: string) => {
        setClipboard({ type: 'repository', id: repositoryId, repositoryId: repositoryId })
        toast.success("Copied repository")
    }

    const handlePasteToRepository = async (targetRepoId: string) => {
        if (!clipboard) return

        try {
            if (clipboard.type === 'repository') {
                // Duplicate Repository
                // We find the source repository to get its details
                const sourceRepo = repositories.find(r => r.id === clipboard.id)
                if (!sourceRepo) return

                await forkRepositoryAction({
                    sourceRepositoryId: clipboard.id,
                    workspaceId: sourceRepo.workspaceId,
                    name: `${sourceRepo.name} (Copy)`,
                    description: sourceRepo.description
                })
                toast.success("Repository duplicated")
            } else if (clipboard.type === 'asset') {
                // Paste Asset into Repository Root
                 toast.promise(duplicateAssetAction({
                    assetId: clipboard.id,
                    targetRepositoryId: targetRepoId,
                    targetFolderId: null // Root
                }), {
                    loading: "Pasting asset...",
                    success: "Asset pasted",
                    error: "Failed to paste asset"
                })
            } else if (clipboard.type === 'folder') {
                // Paste Folder into Repository Root
                 toast.promise(copyRepositoryFolderAction({
                    sourceFolderId: clipboard.id,
                    sourceRepositoryId: clipboard.repositoryId,
                    targetRepositoryId: targetRepoId,
                    targetParentId: null // Root
                }), {
                    loading: "Pasting folder...",
                    success: "Folder pasted",
                    error: "Failed to paste folder"
                })
            }
            await refresh()
        } catch (e) {
            console.error("Paste failed", e)
            toast.error("Failed to paste")
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
                onSnapshotRepository={setSnapshotRepoId}
                onDeleteRepository={handleDeleteRepository}
                onRenameRepository={handleRenameRepository}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onMoveFolder={handleMoveFolder}
                onMoveAsset={handleMoveAsset}
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
