"use client"

import * as React from "react"
import { SnapshotItemRecord } from "@/lib/repositories/snapshots"
import { Folder as FolderIcon, FileImage, ChevronRight, Package, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui/collapsible"

interface SnapshotTreeViewerProps {
    items: SnapshotItemRecord[]
    onSelect?: (item: SnapshotItemRecord) => void
    selectedItemId?: string | null
    rootName?: string
    onSelectRoot?: () => void
}

export function SnapshotTreeViewer({ items, onSelect, selectedItemId, rootName, onSelectRoot }: SnapshotTreeViewerProps) {
    if (items.length === 0 && !rootName) {
        return <div className="text-sm text-muted-foreground p-4 italic">Empty snapshot</div>
    }

    // Always expanded state for Root (conceptually)
    
    return (
        <div className="space-y-1 select-none">
            {rootName && (
                <div 
                    onClick={onSelectRoot}
                    className={cn(
                        "flex items-center w-full gap-0.5 rounded-sm hover:bg-muted/40 p-1 cursor-pointer transition-colors",
                        selectedItemId === "ROOT" && "bg-accent text-accent-foreground"
                    )}
                >
                    <div className="p-1 min-w-[24px] h-6 flex items-center justify-center text-muted-foreground">
                         <ChevronRight className="h-3 w-3 rotate-90" />
                    </div>
                    <div className="flex items-center h-7 px-2 flex-1 min-w-0 text-sm font-medium">
                        <Archive className="mr-2 h-4 w-4 shrink-0 text-foreground/80" />
                        <span className="truncate">{rootName}</span>
                    </div>
                </div>
            )}
            
            <div className={cn(
                "flex flex-col gap-0.5",
                rootName && "pl-4 relative border-l border-border/40 ml-3.5"
            )}>
                {items.map(item => (
                    <TreeNode 
                        key={item.id} 
                        node={item} 
                        onSelect={onSelect}
                        selectedItemId={selectedItemId}
                    />
                ))}
            </div>
        </div>
    )
}

function TreeNode({ node, onSelect, selectedItemId }: { node: SnapshotItemRecord, onSelect?: (item: SnapshotItemRecord) => void, selectedItemId?: string | null }) {
    const isFolder = node.itemType === "folder"
    const hasChildren = node.children && node.children.length > 0
    // Default open for viewing
    const [isOpen, setIsOpen] = React.useState(true) 

    const assetName = (node.itemData.meta as any)?.name || node.itemData.name || node.itemData.storage_path?.split("/").pop() || "Untitled"
    const folderName = node.itemData.name || "Untitled Folder"

    if (isFolder) {
        const isSelected = selectedItemId === node.id
        return (
            <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="group/folder"
            >
                <div className={cn(
                    "flex items-center w-full gap-0.5 rounded-sm hover:bg-muted/40 p-1 transition-colors",
                    isSelected && "bg-accent text-accent-foreground"
                )}>
                    {hasChildren ? (
                         <CollapsibleTrigger asChild>
                            <button
                                onClick={(e) => e.stopPropagation()} // Prevent selecting when just toggling
                                className="p-1 min-w-[24px] h-6 flex items-center justify-center hover:bg-muted/60 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                                <ChevronRight className={cn(
                                    "h-3 w-3 transition-transform duration-200",
                                    isOpen ? "rotate-90" : ""
                                )} />
                            </button>
                        </CollapsibleTrigger>
                    ) : (
                        <div className="w-[24px] h-6 shrink-0" />
                    )}

                    <div 
                        onClick={() => onSelect?.(node)}
                        className="flex items-center h-7 px-2 flex-1 min-w-0 cursor-pointer text-foreground/80 text-sm font-medium"
                    >
                        <FolderIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{folderName}</span>
                    </div>
                </div>

                <CollapsibleContent>
                    <div className="flex flex-col gap-0.5 pl-4 relative border-l border-border/40 ml-2.5 my-1">
                        {node.children?.map(child => (
                            <TreeNode 
                                key={child.id} 
                                node={child} 
                                onSelect={onSelect}
                                selectedItemId={selectedItemId}
                            />
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )
    }

    // Asset Node
    const isSelected = selectedItemId === node.id
    return (
        <div 
            onClick={() => onSelect?.(node)}
            className={cn(
                "flex items-center w-full gap-0.5 rounded-sm hover:bg-muted/40 p-1 cursor-pointer transition-colors",
                isSelected && "bg-accent text-accent-foreground"
            )}
        >
            <div className="w-[24px] h-6 shrink-0" />
            <div className={cn(
                "flex items-center h-7 px-2 flex-1 min-w-0 text-muted-foreground text-sm",
                isSelected && "text-accent-foreground font-medium"
            )}>
                <FileImage className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{assetName}</span>
            </div>
        </div>
    )
}
