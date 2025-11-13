"use client"

import * as React from "react"
import { FilePlus, FolderPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { FolderTree, type PendingFolderInput, type PendingPatternInput } from "@/components/app-sidebar/folder-tree"
import { allowContextMenuProps } from "@/lib/context-menu"
import type { Folder, Pattern } from "@/lib/types"

type ArchiveTreeSectionState = {
  folders: Folder[]
  patterns: Pattern[]
  selectedPatternId: string | null
  selectedFolderId: string | null
  pendingPatternInput: PendingPatternInput | null
  pendingFolderInput: PendingFolderInput | null
}

type ArchiveTreeSectionHandlers = {
  onPatternSelect: (patternId: string) => void
  onFolderSelect: (folderId: string | null) => void
  onPatternInputSubmit: (name: string, folderId: string | null) => void
  onFolderInputSubmit: (name: string, parentId: string | null) => void
  onPatternInputCancel: () => void
  onFolderInputCancel: () => void
  onPatternCreateRequest: (folderId: string | null) => void
  onFolderCreateRequest: (parentId: string | null) => void
  onPatternDelete: (patternId: string) => void
  onFolderDelete: (folderId: string) => void
  onPatternMove?: (patternId: string, destinationFolderId: string | null) => void
  onFolderMove?: (folderId: string, destinationFolderId: string | null) => void
  onBackgroundClick: (event: React.MouseEvent<HTMLDivElement>) => void
  onBackgroundContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void
  onRootPatternClick: () => void
  onRootFolderClick: () => void
  clearSelection: () => void
}

type ArchiveTreeSectionProps = {
  title: string
  state: ArchiveTreeSectionState
  handlers: ArchiveTreeSectionHandlers
}

export function ArchiveTreeSection({ title, state, handlers }: ArchiveTreeSectionProps) {
  const {
    folders,
    patterns,
    selectedPatternId,
    selectedFolderId,
    pendingPatternInput,
    pendingFolderInput,
  } = state
  const {
    onPatternSelect,
    onFolderSelect,
    onPatternInputSubmit,
    onFolderInputSubmit,
    onPatternInputCancel,
    onFolderInputCancel,
    onPatternCreateRequest,
    onFolderCreateRequest,
    onPatternDelete,
    onFolderDelete,
    onPatternMove,
    onFolderMove,
    onBackgroundClick,
    onBackgroundContextMenu,
    onRootPatternClick,
    onRootFolderClick,
    clearSelection,
  } = handlers

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          {...allowContextMenuProps}
          className="flex flex-1 flex-col"
          onClick={onBackgroundClick}
          onContextMenu={onBackgroundContextMenu}
        >
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between gap-2">
              <span
                role="button"
                tabIndex={0}
                className="select-none"
                onClick={clearSelection}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    clearSelection()
                  }
                }}
              >
                {title}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground"
                  aria-label="새 패턴 추가"
                  onClick={onRootPatternClick}
                >
                  <FilePlus className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground"
                  aria-label="새 폴더 추가"
                  onClick={onRootFolderClick}
                >
                  <FolderPlus className="size-4" />
                </Button>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-2">
              <div className="rounded-md">
                <FolderTree
                  folders={folders}
                  patterns={patterns}
                  selectedPatternId={selectedPatternId ?? undefined}
                  onPatternSelect={onPatternSelect}
                  pendingPatternInput={pendingPatternInput}
                  pendingFolderInput={pendingFolderInput}
                  onPatternInputSubmit={onPatternInputSubmit}
                  onPatternInputCancel={onPatternInputCancel}
                  onFolderInputSubmit={onFolderInputSubmit}
                  onFolderInputCancel={onFolderInputCancel}
                  selectedFolderId={selectedFolderId}
                  onFolderSelect={onFolderSelect}
                  onPatternCreateRequest={onPatternCreateRequest}
                  onFolderCreateRequest={onFolderCreateRequest}
                  onPatternDelete={onPatternDelete}
                  onFolderDelete={onFolderDelete}
                  onPatternMove={onPatternMove}
                  onFolderMove={onFolderMove}
                />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
          <div
            className="flex-1"
            onClick={onBackgroundClick}
            onContextMenu={onBackgroundContextMenu}
            data-tree-interactive="false"
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48" onCloseAutoFocus={(event) => event.preventDefault()}>
        <ContextMenuItem onSelect={onRootPatternClick}>새 패턴</ContextMenuItem>
        <ContextMenuItem onSelect={onRootFolderClick}>새 폴더</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
