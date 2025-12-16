"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listRepositoriesAction } from "@/app/actions/repositories"
import { listRepositoryFoldersAction } from "@/app/actions/repository-folders"
import { listAssetsAction } from "@/app/actions/assets"
import type { RepositoryRecord } from "@/lib/repositories/repositories"
import type { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"
import type { AssetRecord } from "@/lib/repositories/assets"
import { useSupabaseSession } from "@/lib/supabase/session-context"
import { getWorkspaceMembershipAction } from "@/app/actions/workspaces"

type RepositoryDataContextValue = {
    workspaceId: string | null
    repositories: RepositoryRecord[]
    selectedRepositoryId: string | null
    setSelectedRepositoryId: (id: string | null) => void
    currentFolderId: string | null
    setCurrentFolderId: (id: string | null) => void
    folders: RepositoryFolderRecord[]
    assets: AssetRecord[]
    loading: boolean
    refresh: () => Promise<void>
    clipboard: { type: 'asset' | 'folder' | 'repository', id: string, repositoryId: string } | null
    setClipboard: (cb: { type: 'asset' | 'folder' | 'repository', id: string, repositoryId: string } | null) => void
}

export const RepositoryDataContext = React.createContext<RepositoryDataContextValue | null>(null)

export const useRepositoryData = () => {
    const context = React.useContext(RepositoryDataContext)
    if (!context) {
        throw new Error("useRepositoryData must be used within a RepositoryDataProvider")
    }
    return context
}

export const RepositoryDataProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, loading: sessionLoading } = useSupabaseSession()
    const queryClient = useQueryClient()
    const [selectedRepositoryId, setSelectedRepositoryId] = React.useState<string | null>(null)
    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null)
    const [clipboard, setClipboard] = React.useState<{ type: 'asset' | 'folder' | 'repository', id: string, repositoryId: string } | null>(null)



    // 1. Get Workspace ID (assuming single workspace for now or derived from membership)
    const { data: membership } = useQuery({
        queryKey: ["workspace-membership", user?.id],
        queryFn: async () => {
            if (!user) return null
            return getWorkspaceMembershipAction()
        },
        enabled: !!user
    })
    const workspaceId = membership?.workspaceId

    // 2. Load Repositories
    const { data: repositories = [], isLoading: reposLoading } = useQuery({
        queryKey: ["repositories", workspaceId],
        queryFn: async () => {
            if (!workspaceId) return []
            return listRepositoriesAction(workspaceId)
        },
        enabled: !!workspaceId
    })

    // Auto-select first repository if none selected
    React.useEffect(() => {
        if (!selectedRepositoryId && repositories.length > 0) {
            setSelectedRepositoryId(repositories[0].id)
        }
    }, [repositories, selectedRepositoryId])

    // 3. Load All Folders for Workspace
    const { data: folders = [], isLoading: foldersLoading } = useQuery({
        queryKey: ["repository-folders", "workspace", workspaceId],
        queryFn: async () => {
            if (!workspaceId) return []
            return listRepositoryFoldersAction({ workspaceId })
        },
        enabled: !!workspaceId
    })

    // 4. Load All Assets for Workspace (Recursive)
    const { data: assets = [], isLoading: assetsLoading } = useQuery({
        queryKey: ["assets", "workspace", workspaceId],
        queryFn: async () => {
            if (!workspaceId) return []
            return listAssetsAction({ workspaceId })
        },
        enabled: !!workspaceId
    })

    // Custom setter for folder that also switches repository if needed
    // NOTE: We removed separate useEffect that resets currentFolderId on selectedRepositoryId change
    // to avoid race conditions.
    const handleSetCurrentFolderId = React.useCallback((folderId: string | null) => {
        setCurrentFolderId(folderId)
        
        if (folderId) {
            // Find the folder to get its repository
            const folder = folders.find(f => f.id === folderId)
            if (folder && folder.repositoryId !== selectedRepositoryId) {
                console.log("Switching repository due to folder change", folder.repositoryId)
                setSelectedRepositoryId(folder.repositoryId)
            }
        }
    }, [folders, selectedRepositoryId])

    const loading = sessionLoading || reposLoading || foldersLoading || assetsLoading

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["repositories"] })
        await queryClient.invalidateQueries({ queryKey: ["repository-folders"] })
        await queryClient.invalidateQueries({ queryKey: ["assets"] })
    }

    const value: RepositoryDataContextValue = {
        workspaceId: workspaceId ?? null,
        repositories,
        selectedRepositoryId,
        setSelectedRepositoryId,
        currentFolderId,
        setCurrentFolderId: handleSetCurrentFolderId,
        folders,
        assets,
        loading,
        refresh,
        clipboard,
        setClipboard
    }

    return (
        <RepositoryDataContext.Provider value={value}>
            {children}
        </RepositoryDataContext.Provider>
    )
}
