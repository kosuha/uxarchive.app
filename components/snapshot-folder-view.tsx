"use client"

import * as React from "react"
import { SnapshotItemRecord } from "@/lib/repositories/snapshots"
import { FileImage, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDraggableScroll } from "@/hooks/use-draggable-scroll"

interface SnapshotFolderViewProps {
    title: string
    description?: string | null
    tags?: { id: string; label: string; color: string }[]
    items: SnapshotItemRecord[] // Children of the current folder (or roots)
    onNavigate: (folder: SnapshotItemRecord) => void
    onAssetClick: (asset: SnapshotItemRecord) => void
}

import { Badge } from "@/components/ui/badge"

export function SnapshotFolderView({ title, description, tags, items, onNavigate, onAssetClick }: SnapshotFolderViewProps) {
    const assets = items.filter(i => i.itemType === 'asset')
    const folders = items.filter(i => i.itemType === 'folder').sort((a, b) => (a.itemData.order || 0) - (b.itemData.order || 0))

    return (
        <div className="w-full h-full flex flex-col bg-background">
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-32 pt-4">
                {/* Header Section */}
                <div className="px-8 pb-6 pt-2 space-y-3">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight mb-4">{title}</h1>
                         {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <Badge 
                                        key={tag.id} 
                                        variant="outline" 
                                        className="text-xs font-normal px-2 py-0 border-transparent bg-secondary text-secondary-foreground" // Fallback style
                                        style={tag.color ? {
                                            backgroundColor: `${tag.color}20`,
                                            color: tag.color,
                                            borderColor: `${tag.color}30`
                                        } : undefined}
                                    >
                                        {tag.label}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    {description && (
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl whitespace-pre-wrap">
                            {description}
                        </p>
                    )}
                </div>

                {/* 1. Screens (Direct Assets) */}
                <div className="mt-2">
                    <SnapshotSection
                        title="Screens"
                        assets={assets}
                        onClickAsset={onAssetClick}
                        emptyMessage="No screens in this folder"
                        showIfEmpty={folders.length === 0} 
                    />
                </div>

                {/* 2. Subfolders */}
                {folders.map(folder => (
                    <div key={folder.id} className="mt-2 border-t border-border/40 pt-6">
                        <div 
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => onNavigate(folder)}
                        >
                            <SnapshotSection
                                title={folder.itemData.name}
                                assets={collectRecursiveAssets(folder)}
                                onClickAsset={(asset, e) => {
                                    e.stopPropagation()
                                    onAssetClick(asset)
                                }}
                                tags={folder.itemData.tags}
                                isFolder
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SnapshotSection({ 
    title, 
    assets, 
    onClickAsset, 
    emptyMessage = "No items", 
    showIfEmpty = false,
    isFolder = false,
    tags
}: { 
    title: string, 
    assets: SnapshotItemRecord[], 
    onClickAsset: (asset: SnapshotItemRecord, e: React.MouseEvent) => void,
    emptyMessage?: string,
    showIfEmpty?: boolean,
    isFolder?: boolean,
    tags?: { id: string; label: string; color: string }[]
}) {
    const { ref, events, isDragging } = useDraggableScroll()

    if (!showIfEmpty && assets.length === 0) return null

    return (
        <div className="py-6 space-y-4">
            <div className="flex items-center gap-2 px-8">
                 <div className="flex items-baseline gap-2">
                    {isFolder && <Folder className="w-4 h-4 text-muted-foreground self-center mr-1" />}
                    <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
                    <span className="text-xs text-muted-foreground">{assets.length} items</span>
                 </div>
                 {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-2">
                        {tags.map(tag => (
                            <div 
                                key={tag.id} 
                                className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground"
                                style={tag.color ? {
                                    backgroundColor: `${tag.color}15`,
                                    color: tag.color
                                } : undefined}
                            >
                                {tag.label}
                            </div>
                        ))}
                    </div>
                 )}
            </div>

            <div
                ref={ref}
                {...events}
                className={cn(
                    "flex gap-4 overflow-x-auto px-8 pb-4 scrollbar-hide snap-x",
                    isDragging ? "cursor-grabbing select-none snap-none" : "cursor-grab snap-mandatory"
                )}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {assets.length === 0 ? (
                    <div className="w-full flex items-center justify-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm h-[160px] bg-muted/5">
                        {emptyMessage}
                    </div>
                ) : (
                    assets.map(asset => {
                        const name = (asset.itemData.meta as any)?.name || "Untitled"
                        return (
                            <div key={asset.id} className="relative snap-center shrink-0 flex flex-col gap-3 group w-[240px]">
                                <div 
                                    className="w-full aspect-[9/16] rounded-2xl overflow-hidden border bg-background shadow-sm hover:shadow-md transition-all relative select-none cursor-pointer"
                                    onClick={(e) => onClickAsset(asset, e)}
                                >
                                    <div className="absolute inset-0 bg-muted/10" />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/repository-assets/${asset.itemData.storage_path}`}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="flex flex-col px-1">
                                    <span className="text-xs text-muted-foreground font-medium truncate">
                                        {name}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

function collectRecursiveAssets(node: SnapshotItemRecord): SnapshotItemRecord[] {
    let results: SnapshotItemRecord[] = []
    if (node.children) {
        for (const child of node.children) {
            if (child.itemType === 'asset') {
                results.push(child)
            } else {
                results = results.concat(collectRecursiveAssets(child))
            }
        }
    }
    return results
}
