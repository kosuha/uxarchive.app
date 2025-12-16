"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import type { AssetRecord } from "@/lib/repositories/assets"

interface PublicAssetDetailDialogProps {
    isOpen: boolean
    onClose: () => void
    asset: AssetRecord
    assets?: AssetRecord[]
    onAssetChange?: (asset: AssetRecord) => void
    canDownload?: boolean
}

export function PublicAssetDetailDialog({ 
    isOpen, 
    onClose, 
    asset, 
    assets = [], 
    onAssetChange,
    canDownload = false
}: PublicAssetDetailDialogProps) {
    
    // Name is just from meta, no editing
    const name = (asset.meta as any)?.name || "Untitled"

    const currentIndex = React.useMemo(() => assets.findIndex(a => a.id === asset.id), [assets, asset.id])
    const hasPrevious = currentIndex > 0
    const hasNext = currentIndex < assets.length - 1

    const handlePrevious = React.useCallback(() => {
        if (hasPrevious && onAssetChange) {
            onAssetChange(assets[currentIndex - 1])
        }
    }, [hasPrevious, onAssetChange, assets, currentIndex])

    const handleNext = React.useCallback(() => {
        if (hasNext && onAssetChange) {
            onAssetChange(assets[currentIndex + 1])
        }
    }, [hasNext, onAssetChange, assets, currentIndex])

    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return
            
            if (e.key === 'ArrowLeft') handlePrevious()
            if (e.key === 'ArrowRight') handleNext()
            if (e.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, handlePrevious, handleNext, onClose])

    const handleDownload = async () => {
        if (!canDownload) return
        try {
           const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`
            );
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = name || `asset-${asset.id}.png`; 
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            toast.error("Failed to download asset")
        }
    }

    const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="w-[95vw] h-[90vh] max-w-none sm:max-w-none p-0 gap-0 bg-background border-none shadow-2xl overflow-hidden flex flex-col focus:outline-none rounded-[28px]" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogTitle className="sr-only">{name}</DialogTitle>
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 z-10 shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0 text-foreground">
                        <h2 className="font-medium text-lg truncate">
                            {name}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {canDownload && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70 hover:text-foreground hover:bg-foreground/10 rounded-full" onClick={handleDownload}>
                                <Download className="w-5 h-5" />
                            </Button>
                        )}
                        
                        <div className="w-px h-6 bg-border mx-2" />

                        <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70 hover:text-foreground hover:bg-foreground/10 rounded-full" onClick={onClose}>
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                </div>

                {/* Main Content - Image Preview */}
                <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden min-h-[200px]">
                    {/* Navigation Buttons */}
                    {hasPrevious && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 z-50 h-12 w-12 rounded-full bg-border/40 hover:bg-border/40 text-foreground/70 hover:text-foreground transition-colors border border-border/10"
                            onClick={(e) => {
                                e.stopPropagation()
                                handlePrevious()
                            }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </Button>
                    )}

                    {hasNext && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 z-50 h-12 w-12 rounded-full bg-border/40 hover:bg-border/40 text-foreground/70 hover:text-foreground transition-colors border border-border/10"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNext()
                            }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </Button>
                    )}

                    <div className="relative flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt={name}
                            className="max-w-[calc(90vw-2rem)] max-h-[calc(80vh-4rem)] w-auto h-auto object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    )
}
