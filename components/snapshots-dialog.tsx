"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSnapshotAction, listSnapshotsAction } from "@/app/actions/snapshots"
import { SnapshotRecord } from "@/lib/repositories/snapshots"

interface SnapshotsDialogProps {
    repositoryId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SnapshotsDialog({ repositoryId, open, onOpenChange }: SnapshotsDialogProps) {
    const [snapshots, setSnapshots] = React.useState<SnapshotRecord[]>([])
    const [loading, setLoading] = React.useState(false)
    const [newVersion, setNewVersion] = React.useState("")
    const [newDesc, setNewDesc] = React.useState("")
    const [creating, setCreating] = React.useState(false)

    const fetchSnapshots = React.useCallback(async () => {
        setLoading(true)
        try {
            const data = await listSnapshotsAction(repositoryId)
            setSnapshots(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [repositoryId])

    React.useEffect(() => {
        if (open) fetchSnapshots()
    }, [open, fetchSnapshots])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newVersion.trim()) return

        setCreating(true)
        try {
            await createSnapshotAction({
                repositoryId,
                versionName: newVersion.trim(),
                description: newDesc.trim() || undefined
            })
            setNewVersion("")
            setNewDesc("")
            await fetchSnapshots()
        } catch (e) {
            console.error(e)
            alert("Failed to create snapshot")
        } finally {
            setCreating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Version History (Snapshots)</DialogTitle>
                    <DialogDescription>
                        Create points in time to capture the state of your repository.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4 space-y-6">
                    {/* Create New */}
                    <div className="border rounded-md p-4 bg-muted/30">
                        <h4 className="text-sm font-medium mb-3">Create New Snapshot</h4>
                        <form onSubmit={handleCreate} className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="versionName">Version Name</Label>
                                    <Input
                                        id="versionName"
                                        placeholder="v1.0.0"
                                        value={newVersion}
                                        onChange={e => setNewVersion(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="desc">Description</Label>
                                    <Input
                                        id="desc"
                                        placeholder="Note..."
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={creating || !newVersion.trim()} size="sm" className="self-end">
                                {creating ? "Creating..." : "Create Snapshot"}
                            </Button>
                        </form>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">History</h4>
                        {loading ? (
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : snapshots.length === 0 ? (
                            <div className="text-sm text-center py-8 text-muted-foreground border border-dashed rounded-md">
                                No snapshots yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {snapshots.map(s => (
                                    <div key={s.id} className="flex items-center justify-between border rounded-md p-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{s.versionName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(s.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {s.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" disabled>
                                            View (Coming Soon)
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
