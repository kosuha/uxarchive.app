"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { moveFolderAction, movePatternAction } from "@/app/actions/folders"

import {
  assignTagToPatternAction,
  createFolderAction,
  createTagAction,
  deleteFolderAction,
  deleteTagAction,
  getWorkspaceMembershipAction,
  listWorkspaceFoldersAction,
  listWorkspacePatternsWithTagsAction,
  listWorkspaceTagsAction,
  removeTagFromPatternAction,
  setPatternFavoriteAction,
  updateFolderAction,
  updateTagAction,
} from "@/app/actions/workspaces"
import { createPatternAction, deletePatternAction, updatePatternAction } from "@/app/actions/patterns"
import type { FolderRecord } from "@/lib/repositories/folders"
import type { PatternRecord } from "@/lib/repositories/patterns"
import type { TagType, Pattern, Folder, Tag } from "@/lib/types"
import { useSupabaseSession } from "@/lib/supabase/session-context"
import { DEFAULT_PATTERN_SERVICE_NAME } from "@/lib/pattern-constants"
import { planLimits, resolveEffectivePlan } from "@/lib/plan-limits"
import { toast } from "@/components/ui/use-toast"

type WorkspaceDataContextValue = {
  workspaceId: string | null
  loading: boolean
  error: string | null
  patterns: Pattern[]
  folders: Folder[]
  tags: Tag[]
  planInfo: { code: string; maxPatterns: number; maxPrivatePatterns: number; allowDownloads: boolean } | null
  refresh: () => Promise<void>
  mutations: WorkspaceMutations
}

type WorkspaceMutations = {
  createPattern: (input: { folderId: string | null; name: string; serviceName?: string; summary?: string }) => Promise<void>
  updatePattern: (
    patternId: string,
    updates: Partial<Pick<Pattern, "name" | "serviceName" | "summary" | "author" | "folderId" | "isFavorite" | "captureCount" | "isPublic">>,
  ) => Promise<void>
  setPatternFavorite: (patternId: string, isFavorite: boolean) => Promise<void>
  deletePattern: (patternId: string) => Promise<void>
  createFolder: (input: { name: string; parentId: string | null }) => Promise<void>
  updateFolder: (folderId: string, updates: { name?: string; parentId?: string | null }) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  createTag: (
    input?: { label?: string; type?: TagType; color?: string | null },
    options?: { onOptimisticCreate?: (tag: Tag) => void; onConfirmedCreate?: (tag: Tag) => void }
  ) => Promise<Tag>
  updateTag: (tagId: string, updates: Partial<Pick<Tag, "label" | "type" | "color">>) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  assignTagToPattern: (patternId: string, tagId: string) => Promise<void>
  removeTagFromPattern: (patternId: string, tagId: string) => Promise<void>
  moveFolder: (folderId: string, destinationParentId: string | null) => Promise<void>
  movePattern: (patternId: string, destinationFolderId: string | null) => Promise<void>
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

const mapTagRecordToTag = (record: { id: string; label: string; type: string; color: string | null; createdAt: string }): Tag => ({
  id: record.id,
  label: record.label,
  type: record.type as TagType,
  color: record.color ?? undefined,
  createdAt: record.createdAt,
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
  isPublic: record.isPublic,
  publicUrl: record.publicUrl ?? undefined,
  thumbnailUrl: record.thumbnailUrl ?? undefined,
  views: record.views ?? undefined,
  viewCount: record.viewCount,
  likeCount: record.likeCount,
  forkCount: record.forkCount,
  originalPatternId: record.originalPatternId,
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

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Failed to load data.")

export const WorkspaceDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: sessionLoading } = useSupabaseSession()
  const queryClient = useQueryClient()
  const [mutationError, setMutationError] = React.useState<string | null>(null)
  const patternMutationVersionsRef = React.useRef<Map<string, number>>(new Map()) // drop stale mutation responses

  const fetchWorkspaceMembership = React.useCallback(async (): Promise<WorkspaceMembership> => {
    if (!user) {
      throw new Error("You must be signed in.")
    }
    return getWorkspaceMembershipAction()
  }, [user])

  const loadPatterns = React.useCallback(
    async (workspaceId: string): Promise<PatternQueryData> => {
      return listWorkspacePatternsWithTagsAction(workspaceId)
    },
    [],
  )

  const loadFolders = React.useCallback(
    async (workspaceId: string): Promise<Folder[]> => {
      const folderRecords = await listWorkspaceFoldersAction(workspaceId)
      return folderRecords.map((record) => mapFolderRecordToFolder(record))
    },
    [],
  )

  const loadTags = React.useCallback(
    async (workspaceId: string): Promise<Tag[]> => {
      const tagRecords = await listWorkspaceTagsAction(workspaceId, { onlyActive: false })
      return tagRecords.map((record) => mapTagRecordToTag(record))
    },
    [],
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

    return patternData.records
      .map((record) => {
        const tagIds = patternData.tagIdsByPattern[record.id] ?? []
        const patternTags = tagIds
          .map((tagId) => tagMap.get(tagId))
          .filter((tag): tag is Tag => Boolean(tag))
        return mapPatternRecordToPattern(record, favoritePatternIdSet, patternTags)
      })
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
  }, [favoritePatternIdSet, patternData, tagMap])

  const ensureWorkspace = React.useCallback(() => {
    if (!workspaceId) {
      throw new Error("Workspace context has not been initialized.")
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
    updates: Partial<Pick<Pattern, "name" | "serviceName" | "summary" | "author" | "folderId" | "captureCount" | "isPublic">>,
  ): PatternRecord => ({
    ...record,
    name: typeof updates.name === "string" ? updates.name : record.name,
    serviceName: typeof updates.serviceName === "string" ? updates.serviceName : record.serviceName,
    summary: typeof updates.summary === "string" ? updates.summary : record.summary,
    author: typeof updates.author === "string" ? updates.author : record.author,
    folderId: updates.folderId !== undefined ? updates.folderId ?? null : record.folderId,
    captureCount: typeof updates.captureCount === "number" ? updates.captureCount : record.captureCount,
    isPublic: typeof updates.isPublic === "boolean" ? updates.isPublic : record.isPublic,
    updatedAt: new Date().toISOString(),
  })

  const createPatternMutation = useMutation({
    mutationFn: async (input: { folderId: string | null; name: string; serviceName?: string; summary?: string }) => {
      const workspaceId = ensureWorkspace()
      return createPatternAction({
        workspaceId,
        folderId: input.folderId ?? null,
        name: input.name,
        serviceName: input.serviceName ?? DEFAULT_PATTERN_SERVICE_NAME,
        summary: input.summary ?? "",
        author: getAuthorName(),
      })
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
        serviceName: input.serviceName ?? DEFAULT_PATTERN_SERVICE_NAME,
        summary: input.summary ?? "",
        author: getAuthorName(),
        isPublic: false,
        isArchived: false,
        publicUrl: null,
        thumbnailUrl: null,
        views: 0,
        createdBy: user?.id ?? null,
        createdAt: now,
        updatedAt: now,
        captureCount: 0,
        insightCount: 0,
        viewCount: 0,
        likeCount: 0,
        forkCount: 0,
        originalPatternId: null,
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
      const status = (error as { status?: number })?.status
      const derivedMessage = toErrorMessage(error)
      if (status === 403) {
        toast({
          variant: "destructive",
          title: "Pattern limit reached",
          description: derivedMessage,
        })
      } else {
        setMutationError(derivedMessage)
      }
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
      const record = await updatePatternAction({
        workspaceId,
        patternId,
        name: updates.name,
        serviceName: updates.serviceName,
        summary: updates.summary,
        author: updates.author,
        folderId: typeof updates.folderId === "undefined" ? undefined : updates.folderId,
        isPublic: typeof updates.isPublic === "undefined" ? undefined : updates.isPublic,
      })

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
      const nextVersion = (patternMutationVersionsRef.current.get(patternId) ?? 0) + 1
      patternMutationVersionsRef.current.set(patternId, nextVersion)
      return { previous, version: nextVersion, patternId }
    },
    onError: (error, _input, context) => {
      const status = (error as { status?: number })?.status
      const derivedMessage = toErrorMessage(error)

      const isLimitError = status === 403 || derivedMessage.includes("Free plan allows only")

      if (isLimitError) {
        toast({
          variant: "destructive",
          title: "Pattern limit reached",
          description: derivedMessage,
        })
      } else {
        setMutationError(derivedMessage)
      }
      if (context?.previous && patternsQueryKey) {
        queryClient.setQueryData(patternsQueryKey, context.previous)
      }
    },
    onSuccess: (record, _input, context) => {
      if (!patternsQueryKey) return
      const latestVersion = context?.patternId ? patternMutationVersionsRef.current.get(context.patternId) : undefined
      if (
        typeof latestVersion === "number" &&
        typeof context?.version === "number" &&
        context.version !== latestVersion
      ) {
        return
      }
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
      await deletePatternAction(workspaceId, patternId)
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
      const record = await createFolderAction({ workspaceId, name: input.name, parentId: input.parentId })
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
      const record = await updateFolderAction({ workspaceId, folderId, name: updates.name, parentId: updates.parentId })
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
      await deleteFolderAction({ workspaceId, folderId })
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

  type CreateTagMutationVariables = {
    input?: { label?: string; type?: TagType; color?: string | null }
    onOptimisticCreate?: (tag: Tag) => void
    onConfirmedCreate?: (tag: Tag) => void
  }

  const createTagMutation = useMutation({
    mutationFn: async ({ input }: CreateTagMutationVariables = {}) => {
      const workspaceId = ensureWorkspace()
      const record = await createTagAction({
        workspaceId,
        label: input?.label ?? "New tag",
        type: input?.type ?? "custom",
        color: input?.color ?? null,
      })
      return mapTagRecordToTag(record)
    },
    onMutate: async (variables) => {
      const input = variables?.input
      setMutationError(null)
      if (!tagsQueryKey) return undefined
      await queryClient.cancelQueries({ queryKey: tagsQueryKey })
      const previous = queryClient.getQueryData<Tag[]>(tagsQueryKey)
      const tempId = `temp-tag-${Date.now()}`
      const optimisticTag: Tag = {
        id: tempId,
        label: input?.label ?? "New tag",
        type: input?.type ?? "custom",
        color: input?.color ?? undefined,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Tag[]>(tagsQueryKey, [optimisticTag, ...(previous ?? [])])
      variables?.onOptimisticCreate?.(optimisticTag)
      return { previous, tempId }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous && tagsQueryKey) {
        queryClient.setQueryData(tagsQueryKey, context.previous)
      }
    },
    onSuccess: (tag, variables, context) => {
      variables?.onConfirmedCreate?.(tag)
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
      const record = await updateTagAction({
        workspaceId,
        tagId,
        label: updates.label,
        type: updates.type,
        color: updates.color,
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
      await deleteTagAction({ workspaceId, tagId })
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
      const workspaceId = ensureWorkspace()
      await assignTagToPatternAction({ workspaceId, patternId, tagId })
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
      const workspaceId = ensureWorkspace()
      await removeTagFromPatternAction({ workspaceId, patternId, tagId })
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
      const workspaceId = ensureWorkspace()
      return setPatternFavoriteAction({ workspaceId, patternId, isFavorite })
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

  // Optimistic Move Folder
  const moveFolderMutation = useMutation({
    mutationFn: async ({ folderId, destinationParentId }: { folderId: string; destinationParentId: string | null }) => {
      const workspaceId = ensureWorkspace()
      return moveFolderAction(workspaceId, folderId, destinationParentId)
    },
    onMutate: async ({ folderId, destinationParentId }) => {
      setMutationError(null)
      await queryClient.cancelQueries({ queryKey: foldersQueryKey })
      const previous = queryClient.getQueryData<Folder[]>(foldersQueryKey)
      if (previous) {
        queryClient.setQueryData<Folder[]>(foldersQueryKey, (prev) => {
          if (!prev) return []
          return prev.map((f) => (f.id === folderId ? { ...f, parentId: destinationParentId } : f))
        })
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous) {
        queryClient.setQueryData(foldersQueryKey, context.previous)
      }
      void refresh()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: foldersQueryKey })
    },
  })

  // Optimistic Move Pattern
  const movePatternMutation = useMutation({
    mutationFn: async ({ patternId, destinationFolderId }: { patternId: string; destinationFolderId: string | null }) => {
      const workspaceId = ensureWorkspace()
      return movePatternAction(workspaceId, patternId, destinationFolderId)
    },
    onMutate: async ({ patternId, destinationFolderId }) => {
      setMutationError(null)
      await queryClient.cancelQueries({ queryKey: patternsQueryKey })
      const previous = queryClient.getQueryData<PatternQueryData>(patternsQueryKey)
      if (previous) {
        queryClient.setQueryData<PatternQueryData>(patternsQueryKey, (prev) => {
          if (!prev) return { records: [], totalCount: 0 }
          const updatedRecords = prev.records.map((p) =>
            p.id === patternId ? { ...p, folderId: destinationFolderId } : p
          )
          return { ...prev, records: updatedRecords }
        })
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      setMutationError(toErrorMessage(error))
      if (context?.previous) {
        queryClient.setQueryData(patternsQueryKey, context.previous)
      }
      void refresh()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: patternsQueryKey })
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

  const membershipPending = membershipQuery.isPending && !membershipQuery.data
  const patternsPending = patternsQuery.isPending && !patternsQuery.data
  const foldersPending = foldersQuery.isPending && !foldersQuery.data
  const tagsPending = tagsQuery.isPending && !tagsQuery.data

  const loading =
    sessionLoading ||
    membershipPending ||
    (Boolean(workspaceId) && (patternsPending || foldersPending || tagsPending))

  const queryError = membershipQuery.error ?? patternsQuery.error ?? foldersQuery.error ?? tagsQuery.error

  const error = React.useMemo(() => {
    if (!sessionLoading && !user) {
      return "You must be signed in."
    }
    if (queryError) {
      return toErrorMessage(queryError)
    }
    return mutationError
  }, [mutationError, queryError, sessionLoading, user])

  const createPattern = React.useCallback<WorkspaceMutations["createPattern"]>(
    async (input) => {
      const response = await fetch("/api/profile/plan")
      if (response.ok) {
        const data = (await response.json()) as { planCode?: string; planStatus?: string; effectivePlan?: string }
        const effectivePlan = resolveEffectivePlan(data.planCode ?? data.effectivePlan, data.planStatus)
        const limits = planLimits[effectivePlan] ?? planLimits.free
        const maxPatterns = limits.maxPatterns
        const usageCount = patterns.length
        if (typeof maxPatterns === "number" && usageCount >= maxPatterns) {
          const message =
            effectivePlan === "free"
              ? `You can save up to ${maxPatterns} patterns on the free plan. Upgrade to add more.`
              : `You exceeded the pattern limit (${maxPatterns}) for your current plan. Remove unused patterns or adjust your plan.`
          toast({
            variant: "destructive",
            title: "Pattern limit reached",
            description: message,
          })
          return
        }
      }
      await createPatternMutation.mutateAsync(input)
    },
    [createPatternMutation, patterns.length],
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

  const createTag = React.useCallback<WorkspaceMutations["createTag"]>(
    (input, options) =>
      createTagMutation.mutateAsync({
        input,
        onOptimisticCreate: options?.onOptimisticCreate,
        onConfirmedCreate: options?.onConfirmedCreate,
      }),
    [createTagMutation],
  )

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

  const planInfoQuery = useQuery({
    queryKey: ["plan-info", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/profile/plan")
      if (!response.ok) return null
      const data = (await response.json()) as { planCode?: string; planStatus?: string; effectivePlan?: string }
      const effectivePlan = resolveEffectivePlan(data.planCode ?? data.effectivePlan, data.planStatus)
      const limits = planLimits[effectivePlan] ?? planLimits.free
      return {
        code: effectivePlan,
        maxPatterns: limits.maxPatterns,
        maxPrivatePatterns: limits.maxPrivatePatterns,
        allowDownloads: limits.allowDownloads,
      }
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const planInfo = planInfoQuery.data ?? null

  const value = React.useMemo<WorkspaceDataContextValue>(
    () => ({
      workspaceId,
      loading,
      error,
      patterns,
      folders,
      tags,
      planInfo,
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
        moveFolder: (folderId, dest) => moveFolderMutation.mutateAsync({ folderId, destinationParentId: dest }).then(() => undefined),
        movePattern: (patternId, dest) => movePatternMutation.mutateAsync({ patternId, destinationFolderId: dest }).then(() => undefined),
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
      error,
      folders,
      loading,
      patterns,
      planInfo,
      previewTag,
      refresh,
      removeTagFromPattern,
      setPatternFavorite,
      tags,
      updateFolder,
      updatePattern,
      updateTag,
      workspaceId,
      moveFolderMutation,
      movePatternMutation,
    ],
  )

  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>
}

export const useWorkspaceData = () => {
  const context = React.useContext(WorkspaceDataContext)
  if (!context) {
    throw new Error("useWorkspaceData can only be used within WorkspaceDataProvider.")
  }
  return context
}
