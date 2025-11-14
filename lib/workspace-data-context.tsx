"use client"

import * as React from "react"

import { createFoldersRepository } from "@/lib/repositories/folders"
import { createPatternsRepository } from "@/lib/repositories/patterns"
import { createTagsRepository } from "@/lib/repositories/tags"
import type { TagType, Pattern, Folder, Tag } from "@/lib/types"
import { useSupabaseSession } from "@/lib/supabase/session-context"

type WorkspaceDataContextValue = {
  workspaceId: string | null
  loading: boolean
  error: string | null
  patterns: Pattern[]
  folders: Folder[]
  tags: Tag[]
  refresh: () => Promise<void>
  mutations: WorkspaceMutations
}

type WorkspaceMutations = {
  createPattern: (input: { folderId: string | null; name: string; serviceName?: string; summary?: string }) => Promise<void>
  updatePattern: (patternId: string, updates: Partial<Pick<Pattern, "name" | "serviceName" | "summary" | "author" | "folderId" | "isFavorite" | "captureCount">>) => Promise<void>
  deletePattern: (patternId: string) => Promise<void>
  createFolder: (input: { name: string; parentId: string | null }) => Promise<void>
  updateFolder: (folderId: string, updates: { name?: string; parentId?: string | null }) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  createTag: (input?: { label?: string; type?: TagType; color?: string | null }) => Promise<void>
  updateTag: (tagId: string, updates: Partial<Pick<Tag, "label" | "type" | "color">>) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  assignTagToPattern: (patternId: string, tagId: string) => Promise<void>
  removeTagFromPattern: (patternId: string, tagId: string) => Promise<void>
}

type WorkspaceState = {
  workspaceId: string | null
  patterns: Pattern[]
  folders: Folder[]
  tags: Tag[]
  loading: boolean
  error: string | null
}

const defaultState: WorkspaceState = {
  workspaceId: null,
  patterns: [],
  folders: [],
  tags: [],
  loading: true,
  error: null,
}

const WorkspaceDataContext = React.createContext<WorkspaceDataContextValue | null>(null)

const mapTagRecordToTag = (record: { id: string; label: string; type: string; color: string | null }): Tag => ({
  id: record.id,
  label: record.label,
  type: record.type as TagType,
  color: record.color ?? undefined,
})

export const WorkspaceDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { supabase, user, loading: sessionLoading } = useSupabaseSession()
  const [state, setState] = React.useState<WorkspaceState>(defaultState)

  const fetchWorkspaceMembers = React.useCallback(async () => {
    if (!user) return { workspaceId: null, favorites: new Set<string>() }
    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, favorite_pattern_ids")
      .eq("profile_id", user.id)
      .order("role", { ascending: true })

    if (error) {
      throw new Error(`워크스페이스 정보를 불러오지 못했습니다: ${error.message}`)
    }

    const membership = data?.[0]
    if (!membership) {
      throw new Error("연결된 워크스페이스가 없습니다.")
    }

    const favorites = new Set<string>((membership.favorite_pattern_ids ?? []) as string[])
    return { workspaceId: membership.workspace_id as string, favorites }
  }, [supabase, user])

  const fetchData = React.useCallback(async () => {
    if (sessionLoading) return
    if (!user) {
      setState((prev) => ({ ...prev, loading: false, error: "로그인이 필요합니다." }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { workspaceId, favorites } = await fetchWorkspaceMembers()
      if (!workspaceId) {
        setState((prev) => ({ ...prev, loading: false, error: "워크스페이스를 찾을 수 없습니다." }))
        return
      }

      const patternsRepo = createPatternsRepository(supabase)
      const foldersRepo = createFoldersRepository(supabase)
      const tagsRepo = createTagsRepository(supabase)

      const [patternRecords, folderRecords, tagRecords] = await Promise.all([
        patternsRepo.list({ workspaceId }),
        foldersRepo.list({ workspaceId }),
        tagsRepo.list({ workspaceId, onlyActive: false }),
      ])

      let patternTagLinks: Array<{ pattern_id: string; tag_id: string }> = []
      if (patternRecords.length) {
        const { data: links, error: patternTagError } = await supabase
          .from("pattern_tags")
          .select("pattern_id, tag_id")
          .in(
            "pattern_id",
            patternRecords.map((pattern) => pattern.id),
          )

        if (patternTagError) {
          throw new Error(`패턴 태그 정보를 불러오지 못했습니다: ${patternTagError.message}`)
        }
        patternTagLinks = links ?? []
      }

      const tagMap = new Map(tagRecords.map((record) => [record.id, mapTagRecordToTag(record)]))
      const patternTagsMap = new Map<string, Tag[]>()
      patternTagLinks.forEach((link) => {
        const tag = tagMap.get(link.tag_id)
        if (!tag) return
        const current = patternTagsMap.get(link.pattern_id) ?? []
        patternTagsMap.set(link.pattern_id, [...current, tag])
      })

      const patterns: Pattern[] = patternRecords.map((record) => ({
        id: record.id,
        folderId: record.folderId,
        name: record.name,
        serviceName: record.serviceName,
        summary: record.summary,
        tags: patternTagsMap.get(record.id) ?? [],
        author: record.author,
        isFavorite: favorites.has(record.id),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        captureCount: record.captureCount ?? 0,
      }))

      const folders: Folder[] = folderRecords.map((folder) => ({
        id: folder.id,
        workspaceId: folder.workspaceId,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
      }))

      const tags = tagRecords.map((record) => tagMap.get(record.id) ?? mapTagRecordToTag(record))

      setState({ workspaceId, patterns, folders, tags, loading: false, error: null })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "워크스페이스 데이터를 불러오지 못했습니다.",
      }))
    }
  }, [fetchWorkspaceMembers, sessionLoading, supabase, user])

  React.useEffect(() => {
    if (!sessionLoading) {
      fetchData()
    }
  }, [sessionLoading, fetchData])

  const refresh = React.useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const runMutation = React.useCallback(
    async (operation: () => Promise<void>) => {
      try {
        await operation()
        await fetchData()
      } catch (error) {
        const message = error instanceof Error ? error.message : "데이터를 업데이트하지 못했습니다."
        setState((prev) => ({ ...prev, error: message }))
        throw error
      }
    },
    [fetchData],
  )

  const ensureWorkspace = React.useCallback(() => {
    if (!state.workspaceId) {
      throw new Error("워크스페이스 컨텍스트가 초기화되지 않았습니다.")
    }
    return state.workspaceId
  }, [state.workspaceId])

  const getAuthorName = React.useCallback(() => {
    const metadataName = typeof user?.user_metadata?.full_name === "string" ? user?.user_metadata?.full_name : null
    return metadataName ?? user?.email ?? "Unknown"
  }, [user])

  const createPattern = React.useCallback<WorkspaceMutations["createPattern"]>(
    async (input) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createPatternsRepository(supabase)
        await repo.create({
          workspaceId,
          folderId: input.folderId ?? null,
          name: input.name,
          serviceName: input.serviceName ?? input.name,
          summary: input.summary ?? "",
          author: getAuthorName(),
        })
      })
    },
    [ensureWorkspace, getAuthorName, runMutation, supabase],
  )

  const updatePattern = React.useCallback<WorkspaceMutations["updatePattern"]>(
    async (patternId, updates) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createPatternsRepository(supabase)
        await repo.update({
          workspaceId,
          patternId,
          name: updates.name,
          serviceName: updates.serviceName,
          summary: updates.summary,
          author: updates.author,
          folderId: typeof updates.folderId === "undefined" ? undefined : updates.folderId,
          captureCount: typeof updates.captureCount === "number" ? updates.captureCount : undefined,
        })
      })
    },
    [ensureWorkspace, runMutation, supabase],
  )

  const deletePattern = React.useCallback<WorkspaceMutations["deletePattern"]>(
    async (patternId) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createPatternsRepository(supabase)
        await repo.remove({ workspaceId, patternId })
      })
    },
    [ensureWorkspace, runMutation, supabase],
  )

  const createFolder = React.useCallback<WorkspaceMutations["createFolder"]>(
    async (input) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createFoldersRepository(supabase)
        await repo.create({ workspaceId, name: input.name, parentId: input.parentId })
      })
    },
    [ensureWorkspace, runMutation, supabase],
  )

  const updateFolder = React.useCallback<WorkspaceMutations["updateFolder"]>(
    async (folderId, updates) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createFoldersRepository(supabase)
        await repo.update({ workspaceId, folderId, name: updates.name, parentId: updates.parentId })
      })
    },
    [ensureWorkspace, runMutation, supabase],
  )

  const deleteFolder = React.useCallback<WorkspaceMutations["deleteFolder"]>(
    async (folderId) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createFoldersRepository(supabase)
        await repo.remove({ workspaceId, folderId })
      })
    },
    [ensureWorkspace, runMutation, supabase],
  )

  const createTag = React.useCallback<WorkspaceMutations["createTag"]>(
    async (input) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createTagsRepository(supabase)
        await repo.create({
          workspaceId,
          label: input?.label ?? "새 태그",
          type: input?.type ?? "custom",
          color: input?.color ?? null,
        })
      })
    },
    [ensureWorkspace, runMutation, supabase],
  )

  const updateTag = React.useCallback<WorkspaceMutations["updateTag"]>(
    async (tagId, updates) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const repo = createTagsRepository(supabase)
        await repo.update({
          workspaceId,
          tagId,
          label: updates.label,
          type: updates.type,
          color: updates.color ?? null,
        })
      })
    },
    [ensureWorkspace, runMutation, supabase],
  )

  const deleteTag = React.useCallback<WorkspaceMutations["deleteTag"]>(
    async (tagId) => {
      await runMutation(async () => {
        const workspaceId = ensureWorkspace()
        const patternIds = state.patterns.map((pattern) => pattern.id)
        if (patternIds.length) {
          await supabase
            .from("pattern_tags")
            .delete()
            .eq("tag_id", tagId)
            .in("pattern_id", patternIds)
        }
        const repo = createTagsRepository(supabase)
        await repo.remove({ workspaceId, tagId })
      })
    },
    [ensureWorkspace, runMutation, state.patterns, supabase],
  )

  const assignTagToPattern = React.useCallback<WorkspaceMutations["assignTagToPattern"]>(
    async (patternId, tagId) => {
      await runMutation(async () => {
        await supabase
          .from("pattern_tags")
          .upsert({ pattern_id: patternId, tag_id: tagId }, { onConflict: "pattern_id,tag_id" })
      })
    },
    [runMutation, supabase],
  )

  const removeTagFromPattern = React.useCallback<WorkspaceMutations["removeTagFromPattern"]>(
    async (patternId, tagId) => {
      await runMutation(async () => {
        await supabase
          .from("pattern_tags")
          .delete()
          .eq("pattern_id", patternId)
          .eq("tag_id", tagId)
      })
    },
    [runMutation, supabase],
  )

  const value = React.useMemo<WorkspaceDataContextValue>(
    () => ({
      workspaceId: state.workspaceId,
      loading: state.loading,
      error: state.error,
      patterns: state.patterns,
      folders: state.folders,
      tags: state.tags,
      refresh,
      mutations: {
        createPattern,
        updatePattern,
        deletePattern,
        createFolder,
        updateFolder,
        deleteFolder,
        createTag,
        updateTag,
        deleteTag,
        assignTagToPattern,
        removeTagFromPattern,
      },
    }),
    [
      assignTagToPattern,
      createFolder,
      createPattern,
      createTag,
      deleteFolder,
      deletePattern,
      deleteTag,
      refresh,
      removeTagFromPattern,
      state.error,
      state.folders,
      state.loading,
      state.patterns,
      state.tags,
      state.workspaceId,
      updateFolder,
      updatePattern,
      updateTag,
    ],
  )

  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>
}

export const useWorkspaceData = () => {
  const context = React.useContext(WorkspaceDataContext)
  if (!context) {
    throw new Error("WorkspaceDataProvider 내부에서만 useWorkspaceData를 사용할 수 있습니다.")
  }
  return context
}
