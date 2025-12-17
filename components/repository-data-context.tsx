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
import { getPlanLimitsAction, type PlanLimitsResponse } from "@/app/actions/plans"
import { listWorkspaceTagsAction, createTagAction, updateTagAction, deleteTagAction } from "@/app/actions/workspaces"
import { 
    listAllRepositoryTagsInWorkspaceAction, 
    listAllFolderTagsInWorkspaceAction,
    addTagToRepositoryAction,
    removeTagFromRepositoryAction,
    addTagToFolderAction,
    removeTagFromFolderAction
} from "@/app/actions/item-tags"
import type { Tag, TagType } from "@/lib/types"
import { TagRecord } from "@/lib/repositories/tags"


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
    planData: PlanLimitsResponse | null
    tags: Tag[]
    repositoryTags: Record<string, string[]> // repositoryId -> tagIds
    folderTags: Record<string, string[]> // folderId -> tagIds
    mutations: {
        createTag: (input: { label?: string, type?: TagType, color?: string | null }) => Promise<Tag>
        updateTag: (tagId: string, updates: Partial<Pick<Tag, "label" | "type" | "color">>) => Promise<void>
        deleteTag: (tagId: string) => Promise<void>
        addTagToRepository: (repositoryId: string, tagId: string) => Promise<void>
        removeTagFromRepository: (repositoryId: string, tagId: string) => Promise<void>
        addTagToFolder: (folderId: string, tagId: string) => Promise<void>
        removeTagFromFolder: (folderId: string, tagId: string) => Promise<void>
    }
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

    // 5. Load Plan Limits
    const { data: planData = null } = useQuery({
        queryKey: ["plan-limits", workspaceId],
        queryFn: async () => {
            if (!workspaceId) return null
            return getPlanLimitsAction(workspaceId)
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

    // 6. Load Tags
    const { data: tags = [], isLoading: tagsLoading } = useQuery({
        queryKey: ["tags", "workspace", workspaceId],
        queryFn: async () => {
             if (!workspaceId) return []
             const records = await listWorkspaceTagsAction(workspaceId, { onlyActive: false })
             return records.map(r => ({
                 id: r.id,
                 label: r.label,
                 type: r.type as TagType,
                 color: r.color ?? undefined,
                 createdAt: r.createdAt
             }))
        },
        enabled: !!workspaceId
    })

    // 7. Load Item Tags (Bulk)
    const { data: repositoryTags = {}, isLoading: repoTagsLoading } = useQuery({
        queryKey: ["repository-tags", "workspace", workspaceId],
        queryFn: async () => {
            if (!workspaceId) return {}
            const records = await listAllRepositoryTagsInWorkspaceAction(workspaceId)
            const map: Record<string, string[]> = {}
            records.forEach(r => {
                if (!map[r.repositoryId]) map[r.repositoryId] = []
                map[r.repositoryId].push(r.tagId)
            })
            return map
        },
        enabled: !!workspaceId
    })

    const { data: folderTags = {}, isLoading: folderTagsLoading } = useQuery({
        queryKey: ["folder-tags", "workspace", workspaceId],
        queryFn: async () => {
            if (!workspaceId) return {}
            const records = await listAllFolderTagsInWorkspaceAction(workspaceId)
            const map: Record<string, string[]> = {}
            records.forEach(r => {
                if (!map[r.folderId]) map[r.folderId] = []
                map[r.folderId].push(r.tagId)
            })
            return map
        },
        enabled: !!workspaceId
    })

    const loading = sessionLoading || reposLoading || foldersLoading || assetsLoading || tagsLoading || repoTagsLoading || folderTagsLoading

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["repositories"] })
        await queryClient.invalidateQueries({ queryKey: ["repository-folders"] })
        await queryClient.invalidateQueries({ queryKey: ["assets"] })
        await queryClient.invalidateQueries({ queryKey: ["plan-limits"] })
        await queryClient.invalidateQueries({ queryKey: ["tags"] })
        await queryClient.invalidateQueries({ queryKey: ["repository-tags"] })
        await queryClient.invalidateQueries({ queryKey: ["folder-tags"] })
    }

    const mutations = React.useMemo(() => ({
        createTag: async (input: { label?: string, type?: TagType, color?: string | null }) => {
            if (!workspaceId) throw new Error("No workspace")
            const record = await createTagAction({
                workspaceId,
                label: input.label ?? "New tag",
                type: input.type ?? "custom",
                color: input.color ?? null
            })
            const tag: Tag = {
                id: record.id,
                label: record.label,
                type: record.type as TagType,
                color: record.color ?? undefined,
                createdAt: record.createdAt
            }
            await queryClient.invalidateQueries({ queryKey: ["tags"] })
            return tag
        },
        updateTag: async (tagId: string, updates: Partial<Pick<Tag, "label" | "type" | "color">>) => {
            if (!workspaceId) throw new Error("No workspace")
            await updateTagAction({ workspaceId, tagId, ...updates })
            await queryClient.invalidateQueries({ queryKey: ["tags"] })
        },
        deleteTag: async (tagId: string) => {
            if (!workspaceId) throw new Error("No workspace")
            await deleteTagAction({ workspaceId, tagId })
            await queryClient.invalidateQueries({ queryKey: ["tags"] })
            await queryClient.invalidateQueries({ queryKey: ["repository-tags"] })
            await queryClient.invalidateQueries({ queryKey: ["folder-tags"] })
        },
        addTagToRepository: async (repositoryId: string, tagId: string) => {
             await addTagToRepositoryAction(repositoryId, tagId)
             await queryClient.invalidateQueries({ queryKey: ["repository-tags"] })
        },
        removeTagFromRepository: async (repositoryId: string, tagId: string) => {
             await removeTagFromRepositoryAction(repositoryId, tagId)
             await queryClient.invalidateQueries({ queryKey: ["repository-tags"] })
        },
        addTagToFolder: async (folderId: string, tagId: string) => {
             await addTagToFolderAction(folderId, tagId)
             await queryClient.invalidateQueries({ queryKey: ["folder-tags"] })
        },
        removeTagFromFolder: async (folderId: string, tagId: string) => {
             await removeTagFromFolderAction(folderId, tagId)
             await queryClient.invalidateQueries({ queryKey: ["folder-tags"] })
        }
    }), [workspaceId, queryClient])

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
        setClipboard,
        planData,
        tags,
        repositoryTags,
        folderTags,
        mutations
    }

    return (
        <RepositoryDataContext.Provider value={value}>
            {children}
        </RepositoryDataContext.Provider>
    )
}

