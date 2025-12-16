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
    onMove?: () => void // For future
    type: "repository" | "folder" | "asset"
}

export function ItemContextMenu({ children, onRename, onDelete, type }: ItemContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
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
