"use client"

import { useMemo, useState, type ChangeEvent } from "react"

import { FolderTree } from "./folder-tree"
import { SidebarShell } from "./sidebar-shell"
import { useLeftPanelData } from "./use-left-panel-data"
import { workspaceActions, useWorkspaceStore } from "@/lib/state"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export const LeftPanel = () => {
  const workspaceState = useWorkspaceStore()
  const { folderNodes, folderCount, visiblePatternCount, allFolderIds, folders, tags, filterFlags } = useLeftPanelData({
    searchTerm: workspaceState.searchTerm,
    folderFilterId: workspaceState.folderFilterId,
    favoriteOnly: workspaceState.favoriteOnly,
    tagFilters: workspaceState.tagFilters,
  })

  const [expandedFolders, setExpandedFolders] = useState<Set<string> | null>(null)

  const derivedExpandedFolders = useMemo(() => {
    if (workspaceState.searchTerm.trim().length > 0) {
      return new Set(allFolderIds)
    }
    if (expandedFolders === null) {
      return new Set(allFolderIds)
    }
    return expandedFolders
  }, [workspaceState.searchTerm, allFolderIds, expandedFolders])

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

  const handleFolderFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    workspaceActions.setFolderFilterId(value === "all" ? null : value)
  }

  const tagSelection = useMemo(() => new Set(workspaceState.tagFilters), [workspaceState.tagFilters])

  return (
    <SidebarShell
      searchValue={workspaceState.searchTerm}
      onSearchChange={(value) => workspaceActions.setSearchTerm(value)}
      folderCount={folderCount}
      visiblePatternCount={visiblePatternCount}
    >
      <section className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-4">
        <div className="space-y-2">
          <label htmlFor="folder-filter" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            폴더 필터
          </label>
          <select
            id="folder-filter"
            value={workspaceState.folderFilterId ?? "all"}
            onChange={handleFolderFilterChange}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
          >
            <option value="all">전체 폴더</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">즐겨찾기</p>
            <p className="text-[11px] text-muted-foreground/80">즐겨찾기 패턴만 보기</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={workspaceState.favoriteOnly ? "default" : "outline"}
            onClick={() => workspaceActions.toggleFavoriteOnly()}
          >
            {workspaceState.favoriteOnly ? "켜짐" : "꺼짐"}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">태그 필터</p>
            {workspaceState.tagFilters.length > 0 ? (
              <button
                type="button"
                className="text-[11px] font-medium text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => workspaceActions.clearTagFilters()}
              >
                초기화
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isActive = tagSelection.has(tag.id)
              return (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => workspaceActions.toggleTagFilter(tag.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition",
                    isActive
                      ? "border-primary/80 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:border-border",
                  )}
                  style={isActive && tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                >
                  {tag.label}
                </button>
              )
            })}
            {tags.length === 0 ? <p className="text-[11px] text-muted-foreground">태그가 없습니다.</p> : null}
          </div>
        </div>
      </section>

      <FolderTree
        nodes={folderNodes}
        expandedFolders={derivedExpandedFolders}
        onToggle={handleToggleFolder}
        isFiltering={filterFlags.isFiltering}
      />
    </SidebarShell>
  )
}
