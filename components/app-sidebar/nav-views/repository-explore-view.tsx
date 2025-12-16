"use client"

import * as React from "react"
import { RepositoryTree } from "../repository-tree"
import { useRepositoryData } from "@/components/repository-data-context"
import { CreateRepositoryDialog } from "@/components/create-repository-dialog"
import { SnapshotsDialog } from "@/components/snapshots-dialog"
import { ItemContextMenu } from "@/components/item-context-menu"
import { deleteRepositoryAction, forkRepositoryAction } from "@/app/actions/repositories"

// Wrapper to bridge data and logic
export function RepositoryExploreView() {
    const { repositories, folders, selectedRepositoryId, setSelectedRepositoryId, currentFolderId, setCurrentFolderId, refresh } = useRepositoryData()

    // State for Context Menus and Dialogs
    const [snapshotRepoId, setSnapshotRepoId] = React.useState<string | null>(null)
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

    // Context Menu Handling (We might move specific logic inside RepositoryTree later, but for now here)
    const handleContextMenu = (type: "repository" | "folder", id: string) => {
        // This is a placeholder. 
        // The real implementation in `RepositoryTree` uses DropdownMenu.
        // But the requirement was to use `ItemContextMenu`.
        // I should integrate `ItemContextMenu` inside `RepositoryTree` directly instead of generic dropdowns.
        // Let's refactor `RepositoryTree` to use `ItemContextMenu` component we created in Phase 3.
    }

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

    return (
        <div className="flex flex-col flex-1 h-full">
            <RepositoryTree
                repositories={repositories}
                folders={folders}
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
                onDeleteFolder={(id: string) => {
                    // Implement folder delete
                    if (confirm("Delete folder?")) {
                        // call delete folder action (need to import)
                        alert("Delete folder logic todo")
                    }
                }}
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
