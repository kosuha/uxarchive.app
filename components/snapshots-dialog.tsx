"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    createSnapshotAction,
    listSnapshotsAction,
    deleteSnapshotAction,
    restoreSnapshotAction,
    getSnapshotTreeAction
} from "@/app/actions/snapshots"
import { SnapshotRecord, SnapshotItemRecord } from "@/lib/repositories/snapshots"
import { SnapshotTreeViewer } from "./snapshot-tree-viewer"
import { SnapshotFolderView } from "./snapshot-folder-view"
import { Trash2, RotateCcw, Plus, History, FileImage, Folder, PanelLeft, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
// import { toast } from "sonner" // Removed sonner
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface SnapshotsDialogProps {
    repositoryId: string
    repositoryName?: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SnapshotsDialog({ repositoryId, repositoryName, open, onOpenChange }: SnapshotsDialogProps) {
    const { toast } = useToast()
    const [snapshots, setSnapshots] = React.useState<SnapshotRecord[]>([])
    const [loading, setLoading] = React.useState(false)
    // Separate create state
    const [creating, setCreating] = React.useState(false)
    const [showCreate, setShowCreate] = React.useState(false)

    // Selection & Tree State
    const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotRecord | null>(null)
    const [snapshotTree, setSnapshotTree] = React.useState<any[]>([])
    const [treeLoading, setTreeLoading] = React.useState(false)

    // Viewing Item State
    const [viewingItem, setViewingItem] = React.useState<SnapshotItemRecord | null>(null)
    const [sidebarOpen, setSidebarOpen] = React.useState(true)

    const breadcrumbs = React.useMemo(() => {
        const items = [
            { id: "root", name: repositoryName || "Repository", onClick: () => setViewingItem(null) }
        ]
        if (viewingItem) {
            items.push({
                id: viewingItem.id,
                name: (viewingItem.itemData as any)?.name || "Item",
                onClick: () => { }
            })
        }
        return items
    }, [viewingItem, repositoryName])

    const fetchSnapshots = React.useCallback(async () => {
        setLoading(true)
        try {
            const data = await listSnapshotsAction(repositoryId)
            setSnapshots(data)
        } catch (e) {
            console.error(e)
            toast({ description: "Failed to load snapshots", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }, [repositoryId])

    React.useEffect(() => {
        if (open) fetchSnapshots()
    }, [open, fetchSnapshots])

    // Load tree when selection changes
    React.useEffect(() => {
        if (!selectedSnapshot) {
            setSnapshotTree([])
            return
        }

        const loadTree = async () => {
            setTreeLoading(true)
            try {
                const tree = await getSnapshotTreeAction(selectedSnapshot.id)
                setSnapshotTree(tree)
            } catch (e) {
                console.error(e)
                toast({ description: "Failed to load snapshot details", variant: "destructive" })
            } finally {
                setTreeLoading(false)
            }
        }
        loadTree()
    }, [selectedSnapshot])

    const handleCreateSubmit = async (versionName: string, description: string) => {
        setCreating(true)
        try {
            await createSnapshotAction({
                repositoryId,
                versionName: versionName.trim(),
                description: description.trim() || undefined
            })
            toast({ description: "Snapshot created" })
            await fetchSnapshots()
        } catch (e) {
            console.error(e)
            toast({ description: "Failed to create snapshot", variant: "destructive" })
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (snapshotId: string) => {
        if (!confirm("Are you sure you want to delete this snapshot?")) return

        try {
            await deleteSnapshotAction(snapshotId)
            toast({ description: "Snapshot deleted" })
            if (selectedSnapshot?.id === snapshotId) setSelectedSnapshot(null)
            await fetchSnapshots()
        } catch (e) {
            console.error(e)
            toast({ description: "Failed to delete snapshot", variant: "destructive" })
        }
    }

    const handleRestore = async () => {
        if (!selectedSnapshot) return
        if (!confirm(`Are you sure you want to restore "${selectedSnapshot.versionName}"? \n\nThis will replace the current state of your repository with this snapshot. Current changes will be lost unless you took a snapshot of them.`)) return

        try {
            await restoreSnapshotAction(repositoryId, selectedSnapshot.id)
            toast({ description: "Repository restored to " + selectedSnapshot.versionName })
            onOpenChange(false) // Close dialog on success so user sees changes
            window.location.reload() // Force reload to ensure all state is fresh
        } catch (e) {
            console.error(e)
            toast({ description: "Failed to restore snapshot", variant: "destructive" })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="md:max-w-[95vw] w-full h-[85vh] p-0 gap-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl shadow-2xl">
                <div className="sr-only">
                    <DialogTitle>Repository Snapshots</DialogTitle>
                </div>

                <div className="flex flex-1 h-full overflow-hidden">
                    {/* LEFT SIDEBAR */}
                    {sidebarOpen && (
                        <div className="w-[280px] border-r border-border flex flex-col bg-muted/10 shrink-0 h-full">
                            {/* Sidebar Content (Version Selector + Tree) */}
                            <div className="p-4 border-b border-border bg-background/50">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold text-sm text-foreground/70 flex items-center gap-2">
                                        <History className="w-4 h-4" />
                                        Versions
                                    </h2>
                                    <button
                                        onClick={() => setShowCreate(true)}
                                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        title="Create Version"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <Select
                                    value={selectedSnapshot?.id}
                                    onValueChange={(val) => {
                                        const snap = snapshots.find(s => s.id === val) || null
                                        setSelectedSnapshot(snap)
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-background/50">
                                        <SelectValue placeholder="Select a version" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {snapshots.map(snap => (
                                            <SelectItem key={snap.id} value={snap.id}>
                                                <span className="font-medium mr-2">{snap.versionName}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    ({new Date(snap.createdAt).toLocaleDateString()})
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Tree View */}
                            <div className="flex-1 overflow-y-auto p-2">
                                {loading ? (
                                    <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Loading tree...
                                    </div>
                                ) : (
                                    !selectedSnapshot ? (
                                        <div className="p-4 text-sm text-muted-foreground text-center">
                                            Select a version to inspect.
                                        </div>
                                    ) : (
                                        <SnapshotTreeViewer
                                            items={snapshotTree}
                                            rootName={repositoryName || "Repository"}
                                            onSelectRoot={() => setViewingItem(null)}
                                            onSelect={(item) => setViewingItem(item)}
                                            selectedItemId={viewingItem ? viewingItem.id : "ROOT"}
                                        />
                                    )
                                )}
                            </div>

                            {/* Sidebar Footer */}
                            {selectedSnapshot && (
                                <div className="p-4 border-t border-border bg-background/50 space-y-2">
                                    <div className="text-xs text-muted-foreground px-1">
                                        {selectedSnapshot.tags && selectedSnapshot.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {selectedSnapshot.tags.map(tag => (
                                                    <Badge
                                                        key={tag.id}
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0 h-5 font-normal border-transparent bg-secondary/50 text-secondary-foreground"
                                                        style={tag.color ? {
                                                            backgroundColor: `${tag.color}15`,
                                                            color: tag.color,
                                                            borderColor: `${tag.color}20`
                                                        } : undefined}
                                                    >
                                                        {tag.label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        <p className="line-clamp-2 italic opacity-80 mb-3">
                                            {selectedSnapshot.description || "No description provided."}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 text-xs gap-1.5 border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-orange-900/30 dark:hover:bg-orange-900/20"
                                            onClick={() => handleRestore()}
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Restore
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full h-8 text-xs gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={() => handleDelete(selectedSnapshot.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* RIGHT MAIN: Viewer */}
                    <div className="flex-1 bg-background flex flex-col min-w-0 overflow-hidden relative">
                        {/* TOP HEADER (Breadcrumbs + Sidebar Toggle) */}
                        <div className="h-14 border-b border-border flex items-center px-4 gap-4 bg-background/95 backdrop-blur shrink-0 z-20">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                            >
                                <PanelLeft className={cn("w-4 h-4", !sidebarOpen && "text-foreground")} />
                            </button>

                            <div className="h-4 w-[1px] bg-border" />

                            <div className="flex items-center gap-1.5 overflow-hidden text-sm">
                                {breadcrumbs.map((crumb, i) => (
                                    <React.Fragment key={crumb.id}>
                                        {i > 0 && <span className="text-muted-foreground/40 mx-1">/</span>}
                                        <span
                                            className={cn(
                                                "truncate max-w-[150px] transition-colors cursor-pointer hover:text-foreground hover:underline underline-offset-4",
                                                i === breadcrumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
                                            )}
                                            onClick={crumb.onClick}
                                        >
                                            {crumb.name}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            {viewingItem ? (
                                viewingItem.itemType === 'asset' ? (
                                    <div className="w-full h-full flex flex-col">
                                        {/* Asset Viewer Content */}
                                        <div className="flex items-center justify-between px-8 py-6 z-10 shrink-0">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <h2 className="font-medium text-lg truncate">
                                                    {(viewingItem.itemData.meta as any)?.name || viewingItem.itemData.name || "Untitled Asset"}
                                                </h2>
                                                <p className="text-sm text-muted-foreground font-mono">
                                                    {viewingItem.itemData.width} × {viewingItem.itemData.height}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ux-archive-captures/${viewingItem.itemData.storage_path}`}
                                                alt="Preview"
                                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <SnapshotFolderView
                                        title={viewingItem.itemData?.name || "Untitled Folder"}
                                        description={viewingItem.itemData?.description}
                                        items={viewingItem.children || []}
                                        onNavigate={(folder) => setViewingItem(folder)}
                                        onAssetClick={(asset) => setViewingItem(asset)}
                                        tags={viewingItem.itemData?.tags}
                                    />
                                )
                            ) : (
                                // Root View
                                selectedSnapshot ? (
                                    <SnapshotFolderView
                                        title={repositoryName || "Repository"}
                                        description={selectedSnapshot.repositoryDescription}
                                        items={snapshotTree}
                                        onNavigate={(folder) => setViewingItem(folder)}
                                        onAssetClick={(asset) => setViewingItem(asset)}
                                        tags={selectedSnapshot.tags || undefined}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                                        <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                                            <FileImage className="w-10 h-10 opacity-20" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-foreground mb-2">Snapshot Viewer</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Select a version from the sidebar to inspect.
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {creating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                        {/* Loading Overlay */}
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-lg font-medium">Creating Snapshot...</p>
                        </div>
                    </div>
                )}
            </DialogContent>


            <CreateSnapshotDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreate={handleCreateSubmit}
            />
        </Dialog>
    )
}

function CreateSnapshotDialog({ open, onOpenChange, onCreate }: { open: boolean, onOpenChange: (v: boolean) => void, onCreate: (name: string, desc: string) => void }) {
    const [name, setName] = React.useState("")
    const [desc, setDesc] = React.useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        onCreate(name, desc)
        setName("")
        setDesc("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Version</DialogTitle>
                    <DialogDescription>Save the current state of your repository.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Version Name</Label>
                        <Input placeholder="v1.0.0" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="Optional notes" value={desc} onChange={e => setDesc(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!name.trim()}>Create Snapshot</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
