"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createRepositoryFolderAction } from "@/app/actions/repository-folders"
import { useRepositoryData } from "@/components/repository-data-context"
import { FolderPlus } from "lucide-react"

interface CreateFolderDialogProps {
    repositoryId: string
    parentId: string | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function CreateFolderDialog({
    repositoryId,
    parentId,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    trigger
}: CreateFolderDialogProps) {
    const { refresh } = useRepositoryData()
    const [internalOpen, setInternalOpen] = React.useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const handleOpenChange = (newOpen: boolean) => {
        if (isControlled && setControlledOpen) {
            setControlledOpen(newOpen)
        } else {
            setInternalOpen(newOpen)
        }
    }

    const [loading, setLoading] = React.useState(false)
    const [name, setName] = React.useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (!name.trim()) {
            setLoading(false)
            return
        }

        try {
            await createRepositoryFolderAction({
                repositoryId,
                parentId,
                name: name.trim(),
            })
            await refresh()
            handleOpenChange(false)
            setName("")
        } catch (error) {
            console.error("Failed to create folder", error)
            alert("Failed to create folder")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                        Create a folder to organize your screens and flows.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="folder-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="folder-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Onboarding Flow"
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Folder"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
