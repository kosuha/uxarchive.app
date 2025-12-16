"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { listAssetsAction } from "@/app/actions/assets"
import { useDraggableScroll } from "@/hooks/use-draggable-scroll"
import { useRepositoryData, RepositoryDataContext } from "@/components/repository-data-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ItemContextMenu } from "./item-context-menu"
import { FileImage, Loader2 } from "lucide-react"


import type { AssetRecord } from "@/lib/repositories/assets"

interface RepositoryFolderSectionProps {
    repositoryId: string
    folderId: string | null
    title: string
    showIfEmpty?: boolean
    assets?: (AssetRecord & { path?: string })[] // Optional pre-loaded assets with path info
    onAssetClick?: (asset: AssetRecord, siblings: AssetRecord[]) => void
}

export function RepositoryFolderSection({
    repositoryId,
    folderId,
    title,
    showIfEmpty = false,
    assets: propsAssets,
    onAssetClick
}: RepositoryFolderSectionProps) {
    const { data: fetchedAssets = [], isLoading } = useQuery({
        queryKey: ["assets", repositoryId, folderId],
        queryFn: async () => listAssetsAction({ repositoryId, folderId }),
        enabled: !!repositoryId && !propsAssets
    })

    const assets = propsAssets || fetchedAssets
    const { ref, events, isDragging } = useDraggableScroll()
    
    // safe usage of context since this might be used in public view without provider
    const context = React.useContext(RepositoryDataContext)
    const setClipboard = context?.setClipboard

    if (isLoading && !propsAssets) {
        return (
            <div className="py-6 space-y-4">
                <div className="flex items-center gap-2 px-8">
                    <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
                </div>
                <div className="px-8 flex gap-4 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-[240px] h-[320px] bg-muted/20 animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (!showIfEmpty && assets.length === 0) return null

    return (
        <div className="py-6 space-y-4">
            <div className="flex items-baseline gap-2 px-8">
                <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
                <span className="text-xs text-muted-foreground">{assets.length} items</span>
            </div>

            <div
                ref={ref}
                {...events}
                className={cn(
                    "flex gap-6 overflow-x-auto px-8 pb-4 scrollbar-hide snap-x",
                    isDragging ? "cursor-grabbing select-none snap-none" : "cursor-grab snap-mandatory"
                )}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {assets.length === 0 ? (
                    <div className="w-full flex items-center justify-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm h-[200px]">
                        No assets in this folder
                    </div>
                ) : (
                    assets.map((asset, index) => (
                        <ItemContextMenu 
                            key={asset.id} 
                            type="asset" 
                            onRename={() => { }} 
                            onDelete={() => { }}
                            onCopy={() => {
                                if (setClipboard) {
                                    setClipboard({ type: 'asset', id: asset.id, repositoryId })
                                    toast.success("Copied asset to clipboard")
                                }
                            }}
                        >
                            <div className="relative snap-center shrink-0 flex flex-col gap-3 group">
                                <div className="w-[280px] aspect-[9/16] rounded-2xl overflow-hidden border bg-background shadow-sm hover:shadow-md transition-all relative select-none">
                                    <div className="absolute inset-0 bg-muted/10" />
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`}
                                        alt="Screen"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        draggable={false}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden')
                                        }}
                                    />
                                    <div className="fallback-icon hidden absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        <FileImage className="w-8 h-8 opacity-50" />
                                    </div>

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    {/* Click Handler Overlay */}
                                    <div 
                                        className="absolute inset-0 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onAssetClick?.(asset, assets)
                                        }}
                                    />
                                </div>


                                <div className="flex flex-col px-1">
                                    <span className="text-xs text-muted-foreground font-medium truncate w-[280px]">
                                        {(asset.meta as any)?.name || asset.storagePath.split('/').pop()}
                                    </span>
                                    {/* Display Path if available (Recursive view) */}
                                    {(asset as any).path && (
                                        <span className="text-[10px] text-muted-foreground/60 truncate w-[280px]">
                                            {(asset as any).path}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </ItemContextMenu>
                    ))
                )}
            </div>
        </div>
    )
}
