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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    createSnapshotAction, 
    listSnapshotsAction, 
    deleteSnapshotAction, 
    restoreSnapshotAction, 
    getSnapshotTreeAction 
} from "@/app/actions/snapshots"
import { SnapshotRecord } from "@/lib/repositories/snapshots"
import { SnapshotTreeViewer } from "./snapshot-tree-viewer"
import { Trash2, RotateCcw, Plus, History, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SnapshotsDialogProps {
    repositoryId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SnapshotsDialog({ repositoryId, open, onOpenChange }: SnapshotsDialogProps) {
    const [snapshots, setSnapshots] = React.useState<SnapshotRecord[]>([])
    const [loading, setLoading] = React.useState(false)
    // Separate create state
    const [creating, setCreating] = React.useState(false)
    const [showCreate, setShowCreate] = React.useState(false)
    
    // Selection & Tree State
    const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotRecord | null>(null)
    const [snapshotTree, setSnapshotTree] = React.useState<any[]>([])
    const [treeLoading, setTreeLoading] = React.useState(false)

    // Viewing Item State (Placeholder)
    const [viewingItem, setViewingItem] = React.useState<any>(null)

    const fetchSnapshots = React.useCallback(async () => {
        setLoading(true)
        try {
            const data = await listSnapshotsAction(repositoryId)
            setSnapshots(data)
        } catch (e) {
            console.error(e)
            toast.error("Failed to load snapshots")
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
                toast.error("Failed to load snapshot details")
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
            toast.success("Snapshot created")
            await fetchSnapshots()
        } catch (e) {
            console.error(e)
            toast.error("Failed to create snapshot")
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (snapshotId: string) => {
        if (!confirm("Are you sure you want to delete this snapshot?")) return

        try {
            await deleteSnapshotAction(snapshotId)
            toast.success("Snapshot deleted")
            if (selectedSnapshot?.id === snapshotId) setSelectedSnapshot(null)
            await fetchSnapshots()
        } catch (e) {
            console.error(e)
            toast.error("Failed to delete snapshot")
        }
    }

    const handleRestore = async () => {
        if (!selectedSnapshot) return
        if (!confirm(`Are you sure you want to restore "${selectedSnapshot.versionName}"? \n\nThis will replace the current state of your repository with this snapshot. Current changes will be lost unless you took a snapshot of them.`)) return

        try {
            await restoreSnapshotAction(repositoryId, selectedSnapshot.id)
            toast.success("Repository restored to " + selectedSnapshot.versionName)
            onOpenChange(false) // Close dialog on success so user sees changes
            window.location.reload() // Force reload to ensure all state is fresh
        } catch (e) {
            console.error(e)
            toast.error("Failed to restore snapshot")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="md:max-w-[95vw] max-h-[90vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
                <div className="flex-1 min-h-0 flex divide-x">
                    {/* LEFT SIDEBAR: Versions & Tree */}
                    <div className="w-[320px] bg-muted/10 flex flex-col shrink-0 border-r border-border">
                        {/* Header / Version Selector */}
                        <div className="p-4 border-b border-border space-y-4 bg-background/50">
                            <div>
                                <h2 className="font-semibold text-lg flex items-center gap-2">
                                    <History className="w-5 h-5" /> History
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">Select a version to inspect.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Select Version</Label>
                                {loading ? (
                                    <div className="h-9 border rounded flex items-center px-3 text-sm text-muted-foreground">Loading...</div>
                                ) : (
                                    <select
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={selectedSnapshot?.id || ""}
                                        onChange={(e) => {
                                            const s = snapshots.find(snap => snap.id === e.target.value)
                                            setSelectedSnapshot(s || null)
                                        }}
                                    >
                                        <option value="" disabled>Select a version...</option>
                                        {snapshots.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.versionName} ({new Date(s.createdAt).toLocaleDateString()})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Create New Trigger? For now keep it hidden or minimal to focus on "View" aspect as per sketch */}
                             <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                    // Could toggle a "Create Mode" or open a small popover
                                    // For simplicity and matching sketch, putting create at bottom or simplified
                                    setShowCreate(true)
                                }}
                             >
                                 <Plus className="w-4 h-4 mr-2" />
                                 Create New Version
                             </Button>
                             {/* Need the create form somewhere. Let's make it a collapsible or specialized mode.
                                 Or just put it at the bottom of sidebar?
                              */}
                        </div>

                        {/* Tree View Area */}
                        <div className="flex-1 overflow-y-auto p-2">
                             {selectedSnapshot ? (
                                 <div className="space-y-2">
                                     <div className="px-2 py-1.5 bg-muted/20 rounded text-xs text-muted-foreground">
                                         {selectedSnapshot.description || "No description provided."}
                                     </div>
                                     {treeLoading ? (
                                         <div className="text-sm text-center py-8 text-muted-foreground">Loading structure...</div>
                                     ) : (
                                         <SnapshotTreeViewer items={snapshotTree} />
                                     )}
                                 </div>
                             ) : (
                                 <div className="text-sm text-center py-12 text-muted-foreground">
                                     Please select a version above.
                                 </div>
                             )}
                        </div>

                        {/* Sidebar Footer: Restore/Delete Actions for selected */}
                        {selectedSnapshot && (
                            <div className="p-3 border-t bg-background/50 space-y-2">
                                <Button
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                    onClick={handleRestore}
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Restore Version
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(selectedSnapshot.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Version
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT MAIN: Viewer */}
                    <div className="flex-1 bg-background flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/20">
                        {/* Placeholder for the "Viewer" area in the sketch */}
                        <div className="text-center p-8 max-w-md">
                            <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileImage className="w-10 h-10 opacity-20" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">Snapshot Viewer</h3>
                            <p className="text-sm">
                                Select a version from the sidebar to view its structure.
                                <br />
                                Click on files in the tree to preview them (Coming Soon).
                            </p>
                        </div>

                        {/*
                            NOTE: The sketch had "Viewer" as a large right block.
                            Currently we don't have a file previewer logic for snapshots (requires signed URLs or loading content from JSON).
                            For V1 of this feature, this placeholder is appropriate.
                        */}
                    </div>
                </div>

                {/* Create Dialog Overlay/Popover could go here if we want "Create" to be a separate mode */}
                {/* Re-adding the "Create" form to the sidebar would be crowded.
                    Let's put the Create Form in a Dialog or switch mode within the sidebar?
                    Or just keep it as a section in the sidebar?
                    Let's add it to the Sidebar Bottom if not selected, or a specific "New" tab?

                    Simpler: Add "Create New" as an option in the dropdown? No.

                    Let's make the "Create New Version" button in the sidebar open a small popover or replace the tree view temporarily?
                    Actually, let's keep the Create Form in the sidebar TOP, collapsable.
                */}
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

            {/* Separate Create Dialog? Or just render it conditionally?
                Let's use a simple state to show "Create Form" in a overlay or separate dialog.
                Actually, the user can just use the "Create" button we added to the sidebar to expand a form.
            */}
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
