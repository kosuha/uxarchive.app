"use client"

import * as React from "react"
import { RepositoryTree } from "../repository-tree"
import { useRepositoryData } from "@/components/repository-data-context"
import { CreateRepositoryDialog } from "@/components/create-repository-dialog"
import { SnapshotsDialog } from "@/components/snapshots-dialog"
import { deleteRepositoryAction, forkRepositoryAction } from "@/app/actions/repositories"
import { deleteRepositoryFolderAction, updateRepositoryFolderAction, moveRepositoryFolderAction } from "@/app/actions/repository-folders"
import { moveRepositoryAssetAction, deleteRepositoryAssetAction, updateRepositoryAssetAction } from "@/app/actions/repository-assets"

// Wrapper to bridge data and logic
export function RepositoryExploreView() {
    const { repositories, folders, assets, selectedRepositoryId, setSelectedRepositoryId, currentFolderId, setCurrentFolderId, refresh } = useRepositoryData()

    // State for Context Menus and Dialogs
    const [snapshotRepoId, setSnapshotRepoId] = React.useState<string | null>(null)
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

    // Handlers
    const handleDeleteRepository = async (id: string) => {
        const repo = repositories.find(r => r.id === id)
        if (!repo) return
        if (confirm("Delete repository?")) {
            await deleteRepositoryAction({ id, workspaceId: repo.workspaceId })
            refresh()
        }
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

    const handleDeleteFolder = async (id: string, repositoryId: string) => {
        console.log("handleDeleteFolder called", { id, repositoryId })
        if (confirm("Delete folder and all its contents?")) {
            await deleteRepositoryFolderAction({ id, repositoryId })
            refresh()
        }
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
        console.log("handleDeleteAsset called", { id, repositoryId })
        if (confirm("Delete asset?")) {
            await deleteRepositoryAssetAction({ id, repositoryId })
            refresh()
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
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onMoveFolder={handleMoveFolder}
                onMoveFolder={handleMoveFolder}
                onMoveAsset={handleMoveAsset}
                onDeleteAsset={handleDeleteAsset}
                onRenameAsset={handleRenameAsset}
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
        </div>
    )
}
