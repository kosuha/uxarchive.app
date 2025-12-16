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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createRepositoryAction } from "@/app/actions/repositories"
import { useRepositoryData } from "@/components/repository-data-context"
import { useSupabaseSession } from "@/lib/supabase/session-context"
import { getWorkspaceMembershipAction } from "@/app/actions/workspaces"
// Removed missing dependencies: react-hook-form, zod, @hookform/resolvers, Checkbox, Form

export function CreateRepositoryDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    const { refresh, setSelectedRepositoryId } = useRepositoryData()
    const { user } = useSupabaseSession()

    const [workspaceId, setWorkspaceId] = React.useState<string | null>(null)

    // Local form state
    const [name, setName] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [isPublic, setIsPublic] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        if (user) {
            getWorkspaceMembershipAction().then(data => setWorkspaceId(data?.workspaceId ?? null))
        }
    }, [user])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!workspaceId) return
        if (!name.trim()) return // Basic validation

        setIsSubmitting(true)
        try {
            const newRepo = await createRepositoryAction({
                workspaceId,
                name: name.trim(),
                description: description.trim() || null,
                isPublic
            })

            // Reset
            setName("")
            setDescription("")
            setIsPublic(false)

            setOpen(false)
            await refresh()
            setSelectedRepositoryId(newRepo.id)
        } catch (error) {
            console.error(error)
            // Show toast error
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Repository</DialogTitle>
                    <DialogDescription>
                        Create a new repository to organize your assets.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="Repository Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            placeholder="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Use native checkbox if shadcn/checkbox missing or use Input type=checkbox */}
                        <input
                            type="checkbox"
                            id="isPublic"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                        />
                        <Label htmlFor="isPublic">Public Repository</Label>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={!workspaceId || isSubmitting || !name.trim()}>
                            {isSubmitting ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
