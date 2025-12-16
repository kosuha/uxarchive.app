"use client"

import * as React from "react"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Pencil, Trash2, FolderInput } from "lucide-react"

interface ItemContextMenuProps {
    children: React.ReactNode
    onRename?: () => void
    onDelete?: () => void
    onFork?: () => void
    onSnapshots?: () => void
    onMove?: () => void // For future
    type: "repository" | "folder" | "asset"
}

export function ItemContextMenu({ children, onRename, onDelete, onFork, onSnapshots, type }: ItemContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                {onFork && (
                    <ContextMenuItem onSelect={onFork}>
                        {/* Use an appropriate icon like GitFork or Copy */}
                        <span className="mr-2">🍴</span>
                        Fork
                    </ContextMenuItem>
                )}
                {onSnapshots && (
                    <ContextMenuItem onSelect={onSnapshots}>
                        <span className="mr-2">📸</span>
                        Snapshots
                    </ContextMenuItem>
                )}
                <ContextMenuItem onSelect={onRename}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={onDelete} className="text-red-600 focus:text-red-600 focus:bg-red-100">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {type}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
