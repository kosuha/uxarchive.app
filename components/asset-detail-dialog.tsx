"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Pencil, Trash2, X, Download, FileImage, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import type { AssetRecord } from "@/lib/repositories/assets"
import { updateAssetAction, deleteAssetAction } from "@/app/actions/assets"
import { cn } from "@/lib/utils"

interface AssetDetailDialogProps {
    isOpen: boolean
    onClose: () => void
    asset: AssetRecord
    repositoryId: string
    assets?: AssetRecord[]
    onAssetChange?: (asset: AssetRecord) => void
}

export function AssetDetailDialog({ isOpen, onClose, asset, repositoryId, assets = [], onAssetChange }: AssetDetailDialogProps) {
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const [isRenaming, setIsRenaming] = React.useState(false)
    const [name, setName] = React.useState((asset.meta as any)?.name || "Untitled")
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [showDeleteAlert, setShowDeleteAlert] = React.useState(false)

    // Reset state when asset changes
    React.useEffect(() => {
        setName((asset.meta as any)?.name || "Untitled")
        setIsRenaming(false)
        setIsDeleting(false)
        setShowDeleteAlert(false)
    }, [asset])

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
            if (!isOpen || isRenaming || showDeleteAlert) return
            
            if (e.key === 'ArrowLeft') handlePrevious()
            if (e.key === 'ArrowRight') handleNext()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, isRenaming, showDeleteAlert, handlePrevious, handleNext])

    const handleRename = async () => {
        if (!name.trim()) return
        
        try {
            await updateAssetAction({
                id: asset.id,
                meta: { ...(asset.meta as object), name: name.trim() }
            })
            // Invalidate queries to refresh the list and derived state in parents
            await queryClient.invalidateQueries({ queryKey: ["assets"] })
            toast({ description: "Asset updated" })
            setIsRenaming(false)
        } catch (error) {
            console.error(error)
            toast({ description: "Failed to update asset", variant: "destructive" })
        }
    }

    const handleDelete = async () => {
        try {
            setIsDeleting(true) // Set loading state for the delete action
            await deleteAssetAction({ id: asset.id })
            await queryClient.invalidateQueries({ queryKey: ["assets"] })
            toast({ description: "Asset deleted" })
            onClose() // Close dialog on success
        } catch (error) {
            toast({ description: "Failed to delete asset", variant: "destructive" })
        } finally {
            setIsDeleting(false) // Reset loading state
            setShowDeleteAlert(false) // Close the alert dialog
        }
    }

    const handleDownload = async () => {
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
            toast({ description: "Failed to download asset", variant: "destructive" })
        }
    }

    const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${asset.storagePath}`

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className="w-[95vw] h-[90vh] max-w-none sm:max-w-none p-0 gap-0 bg-background border-none shadow-2xl overflow-hidden flex flex-col focus:outline-none rounded-[28px]" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogTitle className="sr-only">{name}</DialogTitle>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 z-10 shrink-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0 text-foreground">
                            {isRenaming ? (
                                <div className="flex items-center gap-2 flex-1 max-w-md">
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-8 text-sm bg-transparent border-border text-foreground focus-visible:ring-offset-0 focus-visible:ring-border"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleRename()
                                            if (e.key === "Escape") setIsRenaming(false)
                                        }}
                                    />
                                    <Button size="sm" onClick={handleRename} className="h-8 px-3 bg-border text-foreground hover:bg-border/90">Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsRenaming(false)} className="h-8 px-3 text-foreground/70 hover:text-foreground hover:bg-border/10">Cancel</Button>
                                </div>
                            ) : (
                                <h2 
                                    className="font-medium text-lg truncate cursor-pointer hover:opacity-80 transition-opacity" 
                                    onDoubleClick={() => setIsRenaming(true)}
                                >
                                    {name}
                                </h2>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70 hover:text-foreground hover:bg-border/10 rounded-full" onClick={handleDownload}>
                                <Download className="w-5 h-5" />
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70 hover:text-foreground hover:bg-border/10 rounded-full">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Asset
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="w-px h-6 bg-border mx-2" />

                            <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70 hover:text-foreground hover:bg-border/10 rounded-full" onClick={onClose}>
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

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the asset.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

