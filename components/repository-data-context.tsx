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
    repositories: RepositoryRecord[]
    selectedRepositoryId: string | null
    setSelectedRepositoryId: (id: string | null) => void
    currentFolderId: string | null
    setCurrentFolderId: (id: string | null) => void
    folders: RepositoryFolderRecord[]
    assets: AssetRecord[]
    loading: boolean
    refresh: () => Promise<void>
}

const RepositoryDataContext = React.createContext<RepositoryDataContextValue | null>(null)

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

    // Reset folder when repo changes
    React.useEffect(() => {
        setCurrentFolderId(null)
    }, [selectedRepositoryId])

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

    // 3. Load Folders for Selected Repository
    const { data: folders = [], isLoading: foldersLoading } = useQuery({
        queryKey: ["repository-folders", selectedRepositoryId],
        queryFn: async () => {
            if (!selectedRepositoryId) return []
            return listRepositoryFoldersAction(selectedRepositoryId)
        },
        enabled: !!selectedRepositoryId
    })

    // 4. Load Assets (This is tricky: usually we load assets per folder. 
    // Do we load ALL assets for the repo? Or only for current view?
    // 'Finder' style usually loads per folder.
    // Making this context provide ALL assets might be too heavy.
    // For now, let's keep assets empty in global context and let specific views fetch assets,
    // OR fetch all if the scale permits. The plan implies "Main Content" shows current folder.
    // Let's NOT load assets globally here to match 'Finder' behavior (on demand).
    // actually, for Drag & Drop we might need some awareness, but usually on-demand is better.
    // I will expose a way to fetch assets or just let the view handling it.
    // For simplicity of migration plan which says "Main Content... grid/list view", 
    // let's assume the view component fetches assets for the *current folder*.
    // But wait, the `RepositoryDataContext` is useful for global state.
    // Let's leave `assets` as empty here or remove it if not used globally.
    // I'll leave it out for now to avoid over-fetching.
    // Wait, the interface has `assets`. I'll keep it empty [] for now or remove from type.

    const loading = sessionLoading || reposLoading || foldersLoading

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["repositories"] })
        await queryClient.invalidateQueries({ queryKey: ["repository-folders"] })
    }

    const value: RepositoryDataContextValue = {
        repositories,
        selectedRepositoryId,
        setSelectedRepositoryId,
        currentFolderId,
        setCurrentFolderId,
        folders,
        assets: [], // See note above
        loading,
        refresh
    }

    return (
        <RepositoryDataContext.Provider value={value}>
            {children}
        </RepositoryDataContext.Provider>
    )
}
