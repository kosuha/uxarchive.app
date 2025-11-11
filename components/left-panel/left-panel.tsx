"use client"

import { useMemo, useState } from "react"

import { FolderTree } from "./folder-tree"
import { SidebarShell } from "./sidebar-shell"
import { useLeftPanelData } from "./use-left-panel-data"

export const LeftPanel = () => {
  const { searchTerm, setSearchTerm, folderNodes, folderCount, visiblePatternCount, allFolderIds } = useLeftPanelData()

  const [expandedFolders, setExpandedFolders] = useState<Set<string> | null>(null)

  const derivedExpandedFolders = useMemo(() => {
    if (searchTerm.trim().length > 0) {
      return new Set(allFolderIds)
    }
    if (expandedFolders === null) {
      return new Set(allFolderIds)
    }
    return expandedFolders
  }, [searchTerm, allFolderIds, expandedFolders])

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const base = prev ?? new Set(allFolderIds)
      const next = new Set(base)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  return (
    <SidebarShell
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      folderCount={folderCount}
      visiblePatternCount={visiblePatternCount}
    >
      <FolderTree
        nodes={folderNodes}
        expandedFolders={derivedExpandedFolders}
        onToggle={handleToggleFolder}
        isSearching={searchTerm.trim().length > 0}
      />
    </SidebarShell>
  )
}
