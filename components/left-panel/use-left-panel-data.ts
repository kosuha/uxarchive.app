import { useMemo } from "react"

import { getPatternFilterFlags, patternMatchesFilters, type PatternFilterOptions } from "@/lib/pattern-filters"
import { useStorageCollections } from "@/lib/use-storage-collections"
import type { Folder, Pattern } from "@/lib/types"

export interface FolderTreeNode {
  folder: Folder
  depth: number
  patterns: Pattern[]
  children: FolderTreeNode[]
  visiblePatternCount: number
}

const assignDepth = (nodes: FolderTreeNode[], depth = 0) => {
  nodes.forEach((node) => {
    node.depth = depth
    assignDepth(node.children, depth + 1)
  })
}

const sortNodesByName = (nodes: FolderTreeNode[]) => {
  nodes.sort((a, b) => a.folder.name.localeCompare(b.folder.name, "ko"))
  nodes.forEach((node) => sortNodesByName(node.children))
}

const attachCounts = (node: FolderTreeNode): number => {
  const childCount = node.children.reduce((acc, child) => acc + attachCounts(child), 0)
  node.visiblePatternCount = node.patterns.length + childCount
  return node.visiblePatternCount
}

const pruneNodes = (nodes: FolderTreeNode[]): FolderTreeNode[] =>
  nodes
    .map((node) => {
      node.children = pruneNodes(node.children)
      return node
    })
    .filter((node) => node.visiblePatternCount > 0)

const EMPTY_TAG_FILTERS: string[] = []

const buildFolderTree = (folders: Folder[], patterns: Pattern[], filters: PatternFilterOptions): FolderTreeNode[] => {
  if (!folders.length) return []

  const folderMap = new Map<string, FolderTreeNode>()
  ;[...folders]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .forEach((folder) => {
      folderMap.set(folder.id, { folder, depth: 0, children: [], patterns: [], visiblePatternCount: 0 })
    })

  const normalizedPatterns = [...patterns].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  normalizedPatterns.forEach((pattern) => {
    const node = folderMap.get(pattern.folderId)
    if (!node) return
    if (patternMatchesFilters(pattern, filters)) {
      node.patterns.push(pattern)
    }
  })

  const roots: FolderTreeNode[] = []
  folderMap.forEach((node) => {
    if (node.folder.parentId && folderMap.has(node.folder.parentId)) {
      const parent = folderMap.get(node.folder.parentId)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  assignDepth(roots)
  sortNodesByName(roots)
  roots.forEach((node) => attachCounts(node))

  const { isFiltering } = getPatternFilterFlags(filters)

  if (!isFiltering) {
    return roots
  }

  return pruneNodes(roots)
}

export const useLeftPanelData = (filters: PatternFilterOptions) => {
  const snapshot = useStorageCollections()
  const searchTerm = filters.searchTerm ?? ""
  const folderFilterId = filters.folderFilterId ?? null
  const favoriteOnly = filters.favoriteOnly ?? false
  const tagFilters = filters.tagFilters ?? EMPTY_TAG_FILTERS

  const normalizedFilters: PatternFilterOptions = useMemo(
    () => ({
      searchTerm,
      folderFilterId,
      favoriteOnly,
      tagFilters,
    }),
    [searchTerm, folderFilterId, favoriteOnly, tagFilters],
  )

  const filterFlags = useMemo(() => getPatternFilterFlags(normalizedFilters), [normalizedFilters])

  const folderNodes = useMemo(
    () => buildFolderTree(snapshot.folders, snapshot.patterns, normalizedFilters),
    [snapshot.folders, snapshot.patterns, normalizedFilters],
  )

  const visiblePatternCount = useMemo(
    () => folderNodes.reduce((acc, node) => acc + node.visiblePatternCount, 0),
    [folderNodes],
  )

  const sortedFolders = useMemo(
    () => [...snapshot.folders].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [snapshot.folders],
  )

  const sortedTags = useMemo(
    () => [...snapshot.tags].sort((a, b) => a.label.localeCompare(b.label, "ko")),
    [snapshot.tags],
  )

  return {
    folderNodes,
    folderCount: snapshot.folders.length,
    totalPatternCount: snapshot.patterns.length,
    visiblePatternCount,
    allFolderIds: snapshot.folders.map((folder) => folder.id),
    folders: sortedFolders,
    tags: sortedTags,
    filterFlags,
  }
}
