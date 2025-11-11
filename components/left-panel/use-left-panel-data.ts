import { useMemo, useState } from "react"

import { useStorageCollections } from "@/lib/use-storage-collections"
import type { Folder, Pattern } from "@/lib/types"

export interface FolderTreeNode {
  folder: Folder
  depth: number
  patterns: Pattern[]
  children: FolderTreeNode[]
  visiblePatternCount: number
}

const normalize = (value: string) => value.normalize("NFC").toLowerCase()

const matchesSearch = (pattern: Pattern, query: string) => {
  if (!query) return true
  const target = normalize(query)
  return (
    normalize(pattern.name).includes(target) ||
    normalize(pattern.serviceName).includes(target) ||
    normalize(pattern.summary).includes(target) ||
    pattern.tags.some((tag) => normalize(tag.label).includes(target))
  )
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

const buildFolderTree = (folders: Folder[], patterns: Pattern[], query: string): FolderTreeNode[] => {
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
    if (matchesSearch(pattern, query)) {
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

  if (!query.trim()) {
    return roots
  }

  return pruneNodes(roots)
}

export const useLeftPanelData = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const snapshot = useStorageCollections()

  const folderNodes = useMemo(
    () => buildFolderTree(snapshot.folders, snapshot.patterns, searchTerm),
    [snapshot.folders, snapshot.patterns, searchTerm],
  )

  const visiblePatternCount = useMemo(
    () => folderNodes.reduce((acc, node) => acc + node.visiblePatternCount, 0),
    [folderNodes],
  )

  return {
    searchTerm,
    setSearchTerm,
    folderNodes,
    folderCount: snapshot.folders.length,
    totalPatternCount: snapshot.patterns.length,
    visiblePatternCount,
    allFolderIds: snapshot.folders.map((folder) => folder.id),
  }
}
