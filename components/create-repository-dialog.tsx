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
// import { Checkbox } from "@/components/ui/checkbox" // Unused
import { createRepositoryAction } from "@/app/actions/repositories"
import { useRepositoryData } from "@/components/repository-data-context"
import { Plus } from "lucide-react"

interface CreateRepositoryDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function CreateRepositoryDialog({ open: controlledOpen, onOpenChange: setControlledOpen, trigger }: CreateRepositoryDialogProps) {
    const { refresh } = useRepositoryData()
    const [internalOpen, setInternalOpen] = React.useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    // const setOpen = isControlled ? setControlledOpen : setInternalOpen // Wrapper logic below

    const handleOpenChange = (newOpen: boolean) => {
        if (isControlled && setControlledOpen) {
            setControlledOpen(newOpen)
        } else {
            setInternalOpen(newOpen)
        }
    }

    const [loading, setLoading] = React.useState(false)
    const [name, setName] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [isPrivate, setIsPrivate] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await createRepositoryAction({
                workspaceId,
                name,
                description,
                isPrivate
            })
            await refresh()
            handleOpenChange(false)
            // Reset form
            setName("")
            setDescription("")
            setIsPrivate(false)
        } catch (error) {
            console.error("Failed to create repository", error)
            alert("Failed to create repository")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Repository</DialogTitle>
                    <DialogDescription>
                        Create a new repository to organize your design patterns and assets.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                Description
                            </Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Visibility</Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        id="isPrivate"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={isPrivate}
                                        onChange={(e) => setIsPrivate(e.target.checked)}
                                    />
                                </div>
                                <Label htmlFor="isPrivate">Private Repository</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Repository"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
