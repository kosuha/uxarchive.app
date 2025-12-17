"use client"

import * as React from "react"
import { SnapshotItemRecord } from "@/lib/repositories/snapshots"
import { Folder, FileImage, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SnapshotTreeViewerProps {
    items: SnapshotItemRecord[]
}

export function SnapshotTreeViewer({ items }: SnapshotTreeViewerProps) {
    if (items.length === 0) {
        return <div className="text-sm text-muted-foreground p-4">Empty snapshot</div>
    }

    return (
        <div className="space-y-1">
            {items.map(item => (
                <TreeNode key={item.id} node={item} depth={0} />
            ))}
        </div>
    )
}

function TreeNode({ node, depth }: { node: SnapshotItemRecord; depth: number }) {
    const [expanded, setExpanded] = React.useState(true) // Expand by default for viewing

    const isFolder = node.itemType === "folder"
    const hasChildren = node.children && node.children.length > 0
    const paddingLeft = depth * 16 + 12

    return (
        <div>
            <div 
                className={cn(
                    "flex items-center py-1.5 px-2 hover:bg-muted/50 rounded-sm select-none text-sm",
                    isFolder ? "cursor-pointer" : "cursor-default"
                )}
                style={{ paddingLeft: `${paddingLeft}px` }}
                onClick={() => isFolder && setExpanded(!expanded)}
            >
                <span className="mr-1.5 opacity-50 shrink-0 w-4">
                     {isFolder && (
                        hasChildren ? (
                            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        ) : null
                     )}
                </span>
                
                {isFolder ? (
                    <Folder className="w-4 h-4 mr-2 text-blue-500/70" />
                ) : (
                    <FileImage className="w-4 h-4 mr-2 text-orange-500/70" />
                )}
                
                <span className="truncate">
                    {isFolder ? node.itemData.name : node.itemData.storage_path.split("/").pop()} 
                    {/* Note: storage_path might not be the filename if we store GUIDs, but usually it ends with filename. 
                        Ideally we should use meta name if available, but for now fallback to storage_path logic or assume 
                        we don't display filename perfectly for assets if not in meta. 
                        Looking at asset schema, we don't store 'name' explicitly for assets, usually derived from storage path or meta.
                    */}
                </span>
            </div>

            {isFolder && expanded && node.children && (
                <div>
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}
