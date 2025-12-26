"use client"

import * as React from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragEndEvent,
    type DropAnimation,
    type DragStartEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { FileImage } from "lucide-react"
import type { AssetRecord } from "@/lib/repositories/assets"
import { ItemContextMenu } from "@/components/item-context-menu"

interface AssetGridProps {
    assets: AssetRecord[]
    repositoryId: string
    onReorder: (newOrder: AssetRecord[]) => void
    onAssetClick?: (asset: AssetRecord, allAssets: AssetRecord[]) => void
    onCopyAsset?: (asset: AssetRecord) => void
}

export function AssetGrid({
    assets,
    repositoryId,
    onReorder,
    onAssetClick,
    onCopyAsset
}: AssetGridProps) {
    const [activeId, setActiveId] = React.useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid triggering drag on simple clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = assets.findIndex((item) => item.id === active.id)
            const newIndex = assets.findIndex((item) => item.id === over.id)

            onReorder(arrayMove(assets, oldIndex, newIndex))
        }

        setActiveId(null)
    }

    const dropAnimation: DropAnimation | null = null

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={assets} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-8 pb-8">
                    {assets.map((asset) => (
                        <SortableAssetItem
                            key={asset.id}
                            asset={asset}
                            repositoryId={repositoryId}
                            onClick={() => onAssetClick?.(asset, assets)}
                            onCopy={() => onCopyAsset?.(asset)}
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeId ? (
                    <AssetCardOverlay asset={assets.find(a => a.id === activeId)!} />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

interface SortableAssetItemProps {
    asset: AssetRecord
    repositoryId: string
    onClick?: () => void
    onCopy?: () => void
}

function SortableAssetItem({ asset, repositoryId, onClick, onCopy }: SortableAssetItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: asset.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <ItemContextMenu
            type="asset"
            onRename={() => { }} // Implement later if needed in grid
            onDelete={() => { }} // Implement later if needed in grid
            onCopy={onCopy}
        >
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className="group relative aspect-[9/16] rounded-xl overflow-hidden border bg-background shadow-sm hover:shadow-md transition-all select-none cursor-grab active:cursor-grabbing"
                onClick={(e) => {
                    // Prevent drag click from triggering selection if it was just a click
                    if (!isDragging) {
                        e.stopPropagation()
                        onClick?.()
                    }
                }}
            >
                <div className="absolute inset-0 bg-muted/10" />
                <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`}
                    alt="Screen"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    draggable={false}
                />

                {/* Fallback Icon */}
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground opacity-0 group-[.failed]:opacity-100">
                    <FileImage className="w-8 h-8 opacity-50" />
                </div>

                {/* Overlay with Name */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium truncate">
                        {(asset.meta as any)?.name || "Asset"}
                    </p>
                </div>
            </div>
        </ItemContextMenu>
    )
}

function AssetCardOverlay({ asset }: { asset: AssetRecord }) {
    if (!asset) return null
    return (
        <div className="aspect-[9/16] rounded-xl overflow-hidden border bg-background shadow-xl cursor-grabbing">
            <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`}
                alt="Screen"
                className="w-full h-full object-cover"
            />
        </div>
    )
}
