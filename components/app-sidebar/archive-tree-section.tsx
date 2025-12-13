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
  onFolderRename: (folderId: string, name: string) => void
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
    onFolderRename,
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
          <FolderTree
            title={title}
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
            onFolderRename={onFolderRename}
            onRootPatternClick={onRootPatternClick}
            onRootFolderClick={onRootFolderClick}
            onRootClick={clearSelection}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48" onCloseAutoFocus={(event) => event.preventDefault()}>
        <ContextMenuItem onSelect={onRootPatternClick}>New pattern</ContextMenuItem>
        <ContextMenuItem onSelect={onRootFolderClick}>New folder</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
