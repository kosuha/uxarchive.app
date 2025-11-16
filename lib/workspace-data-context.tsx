"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createFoldersRepository } from "@/lib/repositories/folders"
import type { FolderRecord } from "@/lib/repositories/folders"
import { createPatternsRepository } from "@/lib/repositories/patterns"
import type { PatternRecord } from "@/lib/repositories/patterns"
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
  updatePattern: (
    patternId: string,
    updates: Partial<Pick<Pattern, "name" | "serviceName" | "summary" | "author" | "folderId" | "isFavorite" | "captureCount">>,
  ) => Promise<void>
  setPatternFavorite: (patternId: string, isFavorite: boolean) => Promise<void>
  deletePattern: (patternId: string) => Promise<void>
  createFolder: (input: { name: string; parentId: string | null }) => Promise<void>
  updateFolder: (folderId: string, updates: { name?: string; parentId?: string | null }) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  createTag: (input?: { label?: string; type?: TagType; color?: string | null }) => Promise<Tag>
  updateTag: (tagId: string, updates: Partial<Pick<Tag, "label" | "type" | "color">>) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  assignTagToPattern: (patternId: string, tagId: string) => Promise<void>
  removeTagFromPattern: (patternId: string, tagId: string) => Promise<void>
  previewTag: (tagId: string, updates: Partial<Pick<Tag, "label" | "color">>) => void
}

const WorkspaceDataContext = React.createContext<WorkspaceDataContextValue | null>(null)

type WorkspaceMembership = {
  workspaceId: string
  favoritePatternIds: string[]
}

type PatternQueryData = {
  records: PatternRecord[]
  tagIdsByPattern: Record<string, string[]>
}

const mapTagRecordToTag = (record: { id: string; label: string; type: string; color: string | null }): Tag => ({
  id: record.id,
  label: record.label,
  type: record.type as TagType,
  color: record.color ?? undefined,
})

const mapPatternRecordToPattern = (record: PatternRecord, favorites: Set<string>, tags: Tag[] = []): Pattern => ({
  id: record.id,
  folderId: record.folderId,
  name: record.name,
  serviceName: record.serviceName,
  summary: record.summary,
  tags,
  author: record.author,
  isFavorite: favorites.has(record.id),
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  captureCount: record.captureCount ?? 0,
})

const mapFolderRecordToFolder = (record: FolderRecord): Folder => ({
  id: record.id,
  workspaceId: record.workspaceId,
  name: record.name,
  parentId: record.parentId,
  createdAt: record.createdAt,
})

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.")

export const WorkspaceDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { supabase, user, loading: sessionLoading } = useSupabaseSession()
  const queryClient = useQueryClient()
  const [mutationError, setMutationError] = React.useState<string | null>(null)

  const fetchWorkspaceMembership = React.useCallback(async (): Promise<WorkspaceMembership> => {
    if (!user) {
      throw new Error("로그인이 필요합니다.")
    }
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

    const favoritePatternIds = ((membership.favorite_pattern_ids ?? []) as string[]).filter(Boolean)
    return {
      workspaceId: membership.workspace_id as string,
      favoritePatternIds,
    }
  }, [supabase, user])

  const loadPatterns = React.useCallback(
    async (workspaceId: string): Promise<PatternQueryData> => {
      const repo = createPatternsRepository(supabase)
      const patternRecords = await repo.list({ workspaceId })

      if (!patternRecords.length) {
        return {
          records: [],
          tagIdsByPattern: {},
        }
      }

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

      const tagIdsByPattern = (links ?? []).reduce<Record<string, string[]>>((acc, link) => {
        if (!acc[link.pattern_id]) {
          acc[link.pattern_id] = []
        }
        acc[link.pattern_id].push(link.tag_id)
        return acc
      }, {})

      return {
        records: patternRecords,
        tagIdsByPattern,
      }
    },
    [supabase],
  )

  const loadFolders = React.useCallback(
    async (workspaceId: string): Promise<Folder[]> => {
      const repo = createFoldersRepository(supabase)
      const folderRecords = await repo.list({ workspaceId })
      return folderRecords.map((record) => mapFolderRecordToFolder(record))
    },
    [supabase],
  )

  const loadTags = React.useCallback(
    async (workspaceId: string): Promise<Tag[]> => {
      const repo = createTagsRepository(supabase)
      const tagRecords = await repo.list({ workspaceId, onlyActive: false })
      return tagRecords.map((record) => mapTagRecordToTag(record))
    },
    [supabase],
  )

  const membershipQueryKey = React.useMemo(() => ["workspace-membership", user?.id ?? "anonymous"], [user?.id])

  const membershipQuery = useQuery<WorkspaceMembership>({
    queryKey: membershipQueryKey,
    queryFn: fetchWorkspaceMembership,
    enabled: !sessionLoading && Boolean(user),
  })

  const workspaceId = membershipQuery.data?.workspaceId ?? null
  const patternsQueryKey = React.useMemo(() => (workspaceId ? ["workspace", workspaceId, "patterns"] : null), [workspaceId])
  const foldersQueryKey = React.useMemo(() => (workspaceId ? ["workspace", workspaceId, "folders"] : null), [workspaceId])
  const tagsQueryKey = React.useMemo(() => (workspaceId ? ["workspace", workspaceId, "tags"] : null), [workspaceId])

  const patternsQuery = useQuery<PatternQueryData>({
    queryKey: patternsQueryKey ?? ["workspace", "unknown", "patterns"],
    queryFn: () => loadPatterns(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  })

  const foldersQuery = useQuery<Folder[]>({
    queryKey: foldersQueryKey ?? ["workspace", "unknown", "folders"],
    queryFn: () => loadFolders(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  })

  const tagsQuery = useQuery<Tag[]>({
    queryKey: tagsQueryKey ?? ["workspace", "unknown", "tags"],
    queryFn: () => loadTags(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  })

  const folders = React.useMemo(() => foldersQuery.data ?? [], [foldersQuery.data])
  const tags = React.useMemo(() => tagsQuery.data ?? [], [tagsQuery.data])
  const patternData = patternsQuery.data

  const tagMap = React.useMemo(() => {
    const map = new Map<string, Tag>()
    tags.forEach((tag) => map.set(tag.id, tag))
    return map
  }, [tags])

  const favoritePatternIdsSource = membershipQuery.data?.favoritePatternIds
  const favoritePatternIds = React.useMemo(() => favoritePatternIdsSource ?? [], [favoritePatternIdsSource])
  const favoritePatternIdSet = React.useMemo(() => new Set(favoritePatternIds), [favoritePatternIds])

  const patterns = React.useMemo(() => {
    if (!patternData) {
      return []
    }

    return patternData.records.map((record) => {
      const tagIds = patternData.tagIdsByPattern[record.id] ?? []
      const patternTags = tagIds
        .map((tagId) => tagMap.get(tagId))
        .filter((tag): tag is Tag => Boolean(tag))
      return mapPatternRecordToPattern(record, favoritePatternIdSet, patternTags)
    })
  }, [favoritePatternIdSet, patternData, tagMap])

  const ensureWorkspace = React.useCallback(() => {
    if (!workspaceId) {
      throw new Error("워크스페이스 컨텍스트가 초기화되지 않았습니다.")
    }
    return workspaceId
  }, [workspaceId])

  const getAuthorName = React.useCallback(() => {
    const metadataName = typeof user?.user_metadata?.full_name === "string" ? user?.user_metadata?.full_name : null
    return metadataName ?? user?.email ?? "Unknown"
  }, [user])

  const refresh = React.useCallback(async () => {
    if (!user) return

    const operations: Array<Promise<unknown>> = [queryClient.invalidateQueries({ queryKey: membershipQueryKey })]
    if (patternsQueryKey) {
      operations.push(queryClient.invalidateQueries({ queryKey: patternsQueryKey }))
    }
    if (foldersQueryKey) {
      operations.push(queryClient.invalidateQueries({ queryKey: foldersQueryKey }))
    }
    if (tagsQueryKey) {
      operations.push(queryClient.invalidateQueries({ queryKey: tagsQueryKey }))
    }

    await Promise.all(operations)
  }, [foldersQueryKey, membershipQueryKey, patternsQueryKey, queryClient, tagsQueryKey, user])

  const toRecordUpdates = (
    record: PatternRecord,
    updates: Partial<Pick<Pattern, "name" | "serviceName" | "summary" | "author" | "folderId" | "captureCount">>,
  ): PatternRecord => ({
    ...record,
    name: typeof updates.name === "string" ? updates.name : record.name,
    serviceName: typeof updates.serviceName === "string" ? updates.serviceName : record.serviceName,
    summary: typeof updates.summary === "string" ? updates.summary : record.summary,
    author: typeof updates.author === "string" ? updates.author : record.author,
    folderId: updates.folderId !== undefined ? updates.folderId ?? null : record.folderId,
    captureCount: typeof updates.captureCount === "number" ? updates.captureCount : record.captureCount,
    updatedAt: new Date().toISOString(),
  })

  const createPatternMutation = useMutation({
    mutationFn: async (input: { folderId: string | null; name: string; serviceName?: string; summary?: string }) => {
      const workspaceId = ensureWorkspace()
      const repo = createPatternsRepository(supabase)
      const record = await repo.create({
        workspaceId,
        folderId: input.folderId ?? null,
        name: input.name,
        serviceName: input.serviceName ?? input.name,
        summary: input.summary ?? "",
        author: getAuthorName(),
      })
      return record
    },
    onMutate: async (input) => {
      setMutationError(null)
      if (!patternsQueryKey) {
        return undefined
      }
      await queryClient.cancelQueries({ queryKey: patternsQueryKey })
      const previous = queryClient.getQueryData<PatternQueryData>(patternsQueryKey)
      const tempId = `temp-${Date.now()}`
      const now = new Date().toISOString()
      const optimisticRecord: PatternRecord = {
        id: tempId,
        workspaceId: ensureWorkspace(),
        folderId: input.folderId ?? null,
        name: input.name,
        serviceName: input.serviceName ?? input.name,
        summary: input.summary ?? "",
        author: getAuthorName(),
        isPublic: false,
        isArchived: false,
        createdBy: user?.id ?? null,
        createdAt: now,
        updatedAt: now,
        captureCount: 0,
        insightCount: 0,
      }

      queryClient.setQueryData<PatternQueryData>(patternsQueryKey, (prev) => {
        const nextTagMap = prev?.tagIdsByPattern ? { ...prev.tagIdsByPattern } : {}
        nextTagMap[tempId] = []
        return {
          records: [optimisticRecord, ...(prev?.records ?? [])],
          tagIdsByPattern: nextTagMap,
        }
      })

      return { previous, tempId }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && patternsQueryKey) {
        queryClient.setQueryData(patternsQueryKey, context.previous)
      }
    },
    onSuccess: (record, _input, context) => {
      if (!patternsQueryKey) return
      queryClient.setQueryData<PatternQueryData>(patternsQueryKey, (prev) => {
        if (!prev) {
          return { records: [record], tagIdsByPattern: { [record.id]: [] } }
        }
        const filteredRecords = prev.records.filter((item) => item.id !== context?.tempId)
        return {
          records: [record, ...filteredRecords],
          tagIdsByPattern: {
            ...prev.tagIdsByPattern,
            [record.id]: prev.tagIdsByPattern[record.id] ?? [],
          },
        }
      })
    },
    onSettled: () => {
      if (patternsQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternsQueryKey })
      }
    },
  })

  const updatePatternMutation = useMutation({
    mutationFn: async ({ patternId, updates }: { patternId: string; updates: Parameters<WorkspaceMutations["updatePattern"]>[1] }) => {
      const workspaceId = ensureWorkspace()
      const repo = createPatternsRepository(supabase)
      const record = await repo.update({
        workspaceId,
        patternId,
        name: updates.name,
        serviceName: updates.serviceName,
        summary: updates.summary,
        author: updates.author,
        folderId: typeof updates.folderId === "undefined" ? undefined : updates.folderId,
      } as Parameters<ReturnType<typeof createPatternsRepository>["update"]>[0])

      if (typeof updates.captureCount === "number") {
        record.captureCount = updates.captureCount
      }

      return record
    },
    onMutate: async ({ patternId, updates }) => {
      setMutationError(null)
      if (!patternsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: patternsQueryKey })
      const previous = queryClient.getQueryData<PatternQueryData>(patternsQueryKey)
      if (previous) {
        queryClient.setQueryData<PatternQueryData>(patternsQueryKey, {
          records: previous.records.map((record) =>
            record.id === patternId ? toRecordUpdates(record, updates) : record,
          ),
          tagIdsByPattern: previous.tagIdsByPattern,
        })
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && patternsQueryKey) {
        queryClient.setQueryData(patternsQueryKey, context.previous)
      }
    },
    onSuccess: (record) => {
      if (!patternsQueryKey) return
      queryClient.setQueryData<PatternQueryData>(patternsQueryKey, (prev) => {
        if (!prev) {
          return { records: [record], tagIdsByPattern: { [record.id]: [] } }
        }
        return {
          records: prev.records.map((item) => (item.id === record.id ? record : item)),
          tagIdsByPattern: prev.tagIdsByPattern,
        }
      })
    },
    onSettled: () => {
      if (patternsQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternsQueryKey })
      }
    },
  })

  const deletePatternMutation = useMutation({
    mutationFn: async (patternId: string) => {
      const workspaceId = ensureWorkspace()
      const repo = createPatternsRepository(supabase)
      await repo.remove({ workspaceId, patternId })
    },
    onMutate: async (patternId) => {
      setMutationError(null)
      if (!patternsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: patternsQueryKey })
      const previous = queryClient.getQueryData<PatternQueryData>(patternsQueryKey)
      if (previous) {
        const nextMap = { ...previous.tagIdsByPattern }
        delete nextMap[patternId]
        queryClient.setQueryData<PatternQueryData>(patternsQueryKey, {
          records: previous.records.filter((record) => record.id !== patternId),
          tagIdsByPattern: nextMap,
        })
      }
      return { previous }
    },
    onError: (error, _patternId, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && patternsQueryKey) {
        queryClient.setQueryData(patternsQueryKey, context.previous)
      }
    },
    onSettled: () => {
      if (patternsQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternsQueryKey })
      }
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: async (input: { name: string; parentId: string | null }) => {
      const workspaceId = ensureWorkspace()
      const repo = createFoldersRepository(supabase)
      const record = await repo.create({ workspaceId, name: input.name, parentId: input.parentId })
      return mapFolderRecordToFolder(record)
    },
    onMutate: async (input) => {
      setMutationError(null)
      if (!foldersQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: foldersQueryKey })
      const previous = queryClient.getQueryData<Folder[]>(foldersQueryKey)
      const tempId = `temp-folder-${Date.now()}`
      const optimisticFolder: Folder = {
        id: tempId,
        workspaceId: ensureWorkspace(),
        name: input.name,
        parentId: input.parentId,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Folder[]>(foldersQueryKey, [optimisticFolder, ...(previous ?? [])])
      return { previous, tempId }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && foldersQueryKey) {
        queryClient.setQueryData(foldersQueryKey, context.previous)
      }
    },
    onSuccess: (folder, _input, context) => {
      if (!foldersQueryKey) return
      queryClient.setQueryData<Folder[]>(foldersQueryKey, (prev) => {
        if (!prev) return [folder]
        const others = prev.filter((item) => item.id !== folder.id && item.id !== context?.tempId)
        return [folder, ...others]
      })
    },
    onSettled: () => {
      if (foldersQueryKey) {
        queryClient.invalidateQueries({ queryKey: foldersQueryKey })
      }
    },
  })

  const updateFolderMutation = useMutation({
    mutationFn: async ({ folderId, updates }: { folderId: string; updates: { name?: string; parentId?: string | null } }) => {
      const workspaceId = ensureWorkspace()
      const repo = createFoldersRepository(supabase)
      const record = await repo.update({ workspaceId, folderId, name: updates.name, parentId: updates.parentId })
      return mapFolderRecordToFolder(record)
    },
    onMutate: async ({ folderId, updates }) => {
      setMutationError(null)
      if (!foldersQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: foldersQueryKey })
      const previous = queryClient.getQueryData<Folder[]>(foldersQueryKey)
      if (previous) {
        queryClient.setQueryData<Folder[]>(
          foldersQueryKey,
          previous.map((folder) =>
            folder.id === folderId ? { ...folder, ...updates } : folder,
          ),
        )
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && foldersQueryKey) {
        queryClient.setQueryData(foldersQueryKey, context.previous)
      }
    },
    onSuccess: (folder) => {
      if (!foldersQueryKey) return
      queryClient.setQueryData<Folder[]>(foldersQueryKey, (prev) =>
        prev ? prev.map((item) => (item.id === folder.id ? folder : item)) : [folder],
      )
    },
    onSettled: () => {
      if (foldersQueryKey) {
        queryClient.invalidateQueries({ queryKey: foldersQueryKey })
      }
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const workspaceId = ensureWorkspace()
      const repo = createFoldersRepository(supabase)
      await repo.remove({ workspaceId, folderId })
    },
    onMutate: async (folderId) => {
      setMutationError(null)
      if (!foldersQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: foldersQueryKey })
      const previous = queryClient.getQueryData<Folder[]>(foldersQueryKey)
      if (previous) {
        queryClient.setQueryData<Folder[]>(foldersQueryKey, previous.filter((folder) => folder.id !== folderId))
      }
      return { previous }
    },
    onError: (error, _folderId, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && foldersQueryKey) {
        queryClient.setQueryData(foldersQueryKey, context.previous)
      }
    },
    onSettled: () => {
      if (foldersQueryKey) {
        queryClient.invalidateQueries({ queryKey: foldersQueryKey })
      }
    },
  })

  const createTagMutation = useMutation({
    mutationFn: async (input?: { label?: string; type?: TagType; color?: string | null }) => {
      const workspaceId = ensureWorkspace()
      const repo = createTagsRepository(supabase)
      const record = await repo.create({
        workspaceId,
        label: input?.label ?? "새 태그",
        type: input?.type ?? "custom",
        color: input?.color ?? null,
      })
      return mapTagRecordToTag(record)
    },
    onMutate: async (input) => {
      setMutationError(null)
      if (!tagsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: tagsQueryKey })
      const previous = queryClient.getQueryData<Tag[]>(tagsQueryKey)
      const tempId = `temp-tag-${Date.now()}`
      const optimisticTag: Tag = {
        id: tempId,
        label: input?.label ?? "새 태그",
        type: input?.type ?? "custom",
        color: input?.color ?? undefined,
      }
      queryClient.setQueryData<Tag[]>(tagsQueryKey, [optimisticTag, ...(previous ?? [])])
      return { previous, tempId }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && tagsQueryKey) {
        queryClient.setQueryData(tagsQueryKey, context.previous)
      }
    },
    onSuccess: (tag, _input, context) => {
      if (!tagsQueryKey) return
      queryClient.setQueryData<Tag[]>(tagsQueryKey, (prev) => {
        if (!prev) return [tag]
        const others = prev.filter((item) => item.id !== tag.id && item.id !== context?.tempId)
        return [tag, ...others]
      })
    },
    onSettled: () => {
      if (tagsQueryKey) {
        queryClient.invalidateQueries({ queryKey: tagsQueryKey })
      }
    },
  })

  const updateTagMutation = useMutation({
    mutationFn: async ({ tagId, updates }: { tagId: string; updates: Partial<Pick<Tag, "label" | "type" | "color">> }) => {
      const workspaceId = ensureWorkspace()
      const repo = createTagsRepository(supabase)
      const record = await repo.update({
        workspaceId,
        tagId,
        label: updates.label,
        type: updates.type,
        color: updates.color ?? null,
      })
      return mapTagRecordToTag(record)
    },
    onMutate: async ({ tagId, updates }) => {
      setMutationError(null)
      if (!tagsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: tagsQueryKey })
      const previous = queryClient.getQueryData<Tag[]>(tagsQueryKey)
      if (previous) {
        queryClient.setQueryData<Tag[]>(
          tagsQueryKey,
          previous.map((tag) => (tag.id === tagId ? { ...tag, ...updates } : tag)),
        )
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && tagsQueryKey) {
        queryClient.setQueryData(tagsQueryKey, context.previous)
      }
    },
    onSuccess: (tag) => {
      if (!tagsQueryKey) return
      queryClient.setQueryData<Tag[]>(
        tagsQueryKey,
        (prev) => prev?.map((item) => (item.id === tag.id ? tag : item)) ?? [tag],
      )
    },
    onSettled: () => {
      if (tagsQueryKey) {
        queryClient.invalidateQueries({ queryKey: tagsQueryKey })
      }
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const workspaceId = ensureWorkspace()
      const patternData = patternsQueryKey ? queryClient.getQueryData<PatternQueryData>(patternsQueryKey) : undefined
      const patternIds = patternData?.records.map((pattern) => pattern.id) ?? []

      if (patternIds.length) {
        await supabase
          .from("pattern_tags")
          .delete()
          .eq("tag_id", tagId)
          .in("pattern_id", patternIds)
      }

      const repo = createTagsRepository(supabase)
      await repo.remove({ workspaceId, tagId })
    },
    onMutate: async (tagId) => {
      setMutationError(null)
      if (!tagsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: tagsQueryKey })
      if (patternsQueryKey) {
        await queryClient.cancelQueries({ queryKey: patternsQueryKey })
      }
      const previousTags = queryClient.getQueryData<Tag[]>(tagsQueryKey)
      const previousPatterns = patternsQueryKey
        ? queryClient.getQueryData<PatternQueryData>(patternsQueryKey)
        : undefined

      queryClient.setQueryData<Tag[]>(
        tagsQueryKey,
        (prev) => prev?.filter((tag) => tag.id !== tagId) ?? [],
      )

      if (patternsQueryKey) {
        queryClient.setQueryData<PatternQueryData>(patternsQueryKey, (prev) => {
          if (!prev) return prev
          const nextMap = Object.fromEntries(
            Object.entries(prev.tagIdsByPattern).map(([patternId, ids]) => [
              patternId,
              ids.filter((id) => id !== tagId),
            ]),
          )
          return {
            records: prev.records,
            tagIdsByPattern: nextMap,
          }
        })
      }

      return { previousTags, previousPatterns }
    },
    onError: (error, _tagId, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previousTags && tagsQueryKey) {
        queryClient.setQueryData(tagsQueryKey, context.previousTags)
      }
      if (context?.previousPatterns && patternsQueryKey) {
        queryClient.setQueryData(patternsQueryKey, context.previousPatterns)
      }
    },
    onSettled: () => {
      if (tagsQueryKey) {
        queryClient.invalidateQueries({ queryKey: tagsQueryKey })
      }
      if (patternsQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternsQueryKey })
      }
    },
  })

  const assignTagMutation = useMutation({
    mutationFn: async ({ patternId, tagId }: { patternId: string; tagId: string }) => {
      await supabase.from("pattern_tags").upsert({ pattern_id: patternId, tag_id: tagId }, { onConflict: "pattern_id,tag_id" })
    },
    onMutate: async ({ patternId, tagId }) => {
      setMutationError(null)
      if (!patternsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: patternsQueryKey })
      const previous = queryClient.getQueryData<PatternQueryData>(patternsQueryKey)
      if (previous) {
        const current = previous.tagIdsByPattern[patternId] ?? []
        if (!current.includes(tagId)) {
          queryClient.setQueryData<PatternQueryData>(patternsQueryKey, {
            records: previous.records,
            tagIdsByPattern: {
              ...previous.tagIdsByPattern,
              [patternId]: [...current, tagId],
            },
          })
        }
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && patternsQueryKey) {
        queryClient.setQueryData(patternsQueryKey, context.previous)
      }
    },
    onSettled: () => {
      if (patternsQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternsQueryKey })
      }
    },
  })

  const removeTagMutation = useMutation({
    mutationFn: async ({ patternId, tagId }: { patternId: string; tagId: string }) => {
      await supabase.from("pattern_tags").delete().eq("pattern_id", patternId).eq("tag_id", tagId)
    },
    onMutate: async ({ patternId, tagId }) => {
      setMutationError(null)
      if (!patternsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: patternsQueryKey })
      const previous = queryClient.getQueryData<PatternQueryData>(patternsQueryKey)
      if (previous) {
        queryClient.setQueryData<PatternQueryData>(patternsQueryKey, {
          records: previous.records,
          tagIdsByPattern: {
            ...previous.tagIdsByPattern,
            [patternId]: (previous.tagIdsByPattern[patternId] ?? []).filter((id) => id !== tagId),
          },
        })
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && patternsQueryKey) {
        queryClient.setQueryData(patternsQueryKey, context.previous)
      }
    },
    onSettled: () => {
      if (patternsQueryKey) {
        queryClient.invalidateQueries({ queryKey: patternsQueryKey })
      }
    },
  })

  const setPatternFavoriteMutation = useMutation({
    mutationFn: async ({ patternId, isFavorite }: { patternId: string; isFavorite: boolean }) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.")
      }
      const workspaceId = ensureWorkspace()
      const queryKey = membershipQueryKey
      const previous = queryClient.getQueryData<WorkspaceMembership>(queryKey)
      const nextFavorites = previous?.favoritePatternIds ? [...previous.favoritePatternIds] : []
      const index = nextFavorites.indexOf(patternId)
      if (isFavorite && index === -1) {
        nextFavorites.push(patternId)
      }
      if (!isFavorite && index >= 0) {
        nextFavorites.splice(index, 1)
      }

      const { error } = await supabase
        .from("workspace_members")
        .update({ favorite_pattern_ids: nextFavorites })
        .eq("workspace_id", workspaceId)
        .eq("profile_id", user.id)

      if (error) {
        throw new Error(error.message)
      }
      return nextFavorites
    },
    onMutate: async ({ patternId, isFavorite }) => {
      setMutationError(null)
      await queryClient.cancelQueries({ queryKey: membershipQueryKey })
      const previous = queryClient.getQueryData<WorkspaceMembership>(membershipQueryKey)
      if (previous) {
        const nextFavorites = new Set(previous.favoritePatternIds)
        if (isFavorite) {
          nextFavorites.add(patternId)
        } else {
          nextFavorites.delete(patternId)
        }
        queryClient.setQueryData<WorkspaceMembership>(membershipQueryKey, {
          ...previous,
          favoritePatternIds: Array.from(nextFavorites),
        })
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous) {
        queryClient.setQueryData(membershipQueryKey, context.previous)
      }
      void refresh()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: membershipQueryKey })
    },
  })

  const previewTag = React.useCallback<WorkspaceMutations["previewTag"]>(
    (tagId, updates) => {
      if (!tagsQueryKey) return
      queryClient.setQueryData<Tag[]>(tagsQueryKey, (prev) => {
        if (!prev) return prev
        return prev.map((tag) => (tag.id === tagId ? { ...tag, ...updates } : tag))
      })
    },
    [queryClient, tagsQueryKey],
  )

  const loading =
    sessionLoading ||
    membershipQuery.isPending ||
    (Boolean(workspaceId) && (patternsQuery.isPending || foldersQuery.isPending || tagsQuery.isPending))

  const queryError = membershipQuery.error ?? patternsQuery.error ?? foldersQuery.error ?? tagsQuery.error

  const error = React.useMemo(() => {
    if (!sessionLoading && !user) {
      return "로그인이 필요합니다."
    }
    if (queryError) {
      return toErrorMessage(queryError)
    }
    return mutationError
  }, [mutationError, queryError, sessionLoading, user])

  const createPattern = React.useCallback<WorkspaceMutations["createPattern"]>(
    (input) => createPatternMutation.mutateAsync(input).then(() => undefined),
    [createPatternMutation],
  )

  const updatePattern = React.useCallback<WorkspaceMutations["updatePattern"]>(
    (patternId, updates) => updatePatternMutation.mutateAsync({ patternId, updates }).then(() => undefined),
    [updatePatternMutation],
  )

  const setPatternFavorite = React.useCallback<WorkspaceMutations["setPatternFavorite"]>(
    (patternId, isFavorite) => setPatternFavoriteMutation.mutateAsync({ patternId, isFavorite }).then(() => undefined),
    [setPatternFavoriteMutation],
  )

  const deletePattern = React.useCallback<WorkspaceMutations["deletePattern"]>(
    (patternId) => deletePatternMutation.mutateAsync(patternId),
    [deletePatternMutation],
  )

  const createFolder = React.useCallback<WorkspaceMutations["createFolder"]>(
    (input) => createFolderMutation.mutateAsync(input).then(() => undefined),
    [createFolderMutation],
  )

  const updateFolder = React.useCallback<WorkspaceMutations["updateFolder"]>(
    (folderId, updates) => updateFolderMutation.mutateAsync({ folderId, updates }).then(() => undefined),
    [updateFolderMutation],
  )

  const deleteFolder = React.useCallback<WorkspaceMutations["deleteFolder"]>(
    (folderId) => deleteFolderMutation.mutateAsync(folderId),
    [deleteFolderMutation],
  )

  const createTag = React.useCallback<WorkspaceMutations["createTag"]>((input) => createTagMutation.mutateAsync(input), [createTagMutation])

  const updateTag = React.useCallback<WorkspaceMutations["updateTag"]>(
    (tagId, updates) => updateTagMutation.mutateAsync({ tagId, updates }).then(() => undefined),
    [updateTagMutation],
  )

  const deleteTag = React.useCallback<WorkspaceMutations["deleteTag"]>(
    (tagId) => deleteTagMutation.mutateAsync(tagId),
    [deleteTagMutation],
  )

  const assignTagToPattern = React.useCallback<WorkspaceMutations["assignTagToPattern"]>(
    (patternId, tagId) => assignTagMutation.mutateAsync({ patternId, tagId }).then(() => undefined),
    [assignTagMutation],
  )

  const removeTagFromPattern = React.useCallback<WorkspaceMutations["removeTagFromPattern"]>(
    (patternId, tagId) => removeTagMutation.mutateAsync({ patternId, tagId }).then(() => undefined),
    [removeTagMutation],
  )

  const value = React.useMemo<WorkspaceDataContextValue>(
    () => ({
      workspaceId,
      loading,
      error,
      patterns,
      folders,
      tags,
      refresh,
      mutations: {
        createPattern,
        updatePattern,
        setPatternFavorite,
        deletePattern,
        createFolder,
        updateFolder,
        deleteFolder,
        createTag,
        updateTag,
        deleteTag,
        assignTagToPattern,
        removeTagFromPattern,
        previewTag,
      },
    }),
    [assignTagToPattern, createFolder, createPattern, createTag, deleteFolder, deletePattern, deleteTag, error, folders, loading, patterns, previewTag, refresh, removeTagFromPattern, setPatternFavorite, tags, updateFolder, updatePattern, updateTag, workspaceId],
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
