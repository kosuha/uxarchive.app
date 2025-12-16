"use client"

import * as React from "react"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Calendar, Eye, GitFork, ChevronDown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { updateRepositoryAction } from "@/app/actions/repositories"
import { Textarea } from "@/components/ui/textarea"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface RepositoryHeaderProps {
    repository: RepositoryRecord
}

export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
    // Local state for description editing
    const [description, setDescription] = React.useState(repository.description || "")
    const [isEditingDescription, setIsEditingDescription] = React.useState(false)

    // Sync local state when prop updates (e.g. optimistic update from parent or re-fetch)
    React.useEffect(() => {
        setDescription(repository.description || "")
    }, [repository.description])

    const handleDescriptionBlur = async () => {
        setIsEditingDescription(false)
        if (description !== repository.description) {
            try {
                await updateRepositoryAction({
                    id: repository.id,
                    workspaceId: repository.workspaceId,
                    description: description
                })
                toast.success("Description updated")
            } catch (error) {
                toast.error("Failed to update description")
                setDescription(repository.description || "") // Revert
            }
        }
    }

    const handleVisibilityChange = async (isPublic: boolean) => {
        if (isPublic === repository.isPublic) return

        try {
            await updateRepositoryAction({
                id: repository.id,
                workspaceId: repository.workspaceId,
                isPublic: isPublic
            })
            toast.success(`Repository is now ${isPublic ? 'Public' : 'Private'}`)
        } catch (error) {
            toast.error("Failed to update visibility")
        }
    }

    return (
        <div className="px-6 py-8 border-b border-border/40 space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {repository.name}
                    </h1>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Badge 
                                variant="secondary" 
                                className={cn(
                                    "gap-1.5 h-6 px-2.5 font-normal text-muted-foreground cursor-pointer hover:bg-secondary/80 transition-colors",
                                    repository.isPublic ? "text-green-600 bg-green-500/10 hover:bg-green-500/20" : ""
                                )}
                            >
                                {repository.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {repository.isPublic ? "Public" : "Private"}
                                <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleVisibilityChange(true)}>
                                <Globe className="w-4 h-4 mr-2" />
                                Public
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVisibilityChange(false)}>
                                <Lock className="w-4 h-4 mr-2" />
                                Private
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <div className="max-w-2xl">
                    <Textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleDescriptionBlur}
                        placeholder="Add a description..."
                        className="resize-none min-h-[40px] h-auto overflow-hidden bg-transparent border-transparent hover:border-input focus:border-input transition-all px-0 py-1 text-base leading-relaxed text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 -ml-1 pl-1"
                        rows={1}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 opacity-70" />
                    <span>Created {formatDistanceToNow(new Date(repository.createdAt), { addSuffix: true })}</span>
                </div>
                {repository.viewCount > 0 && (
                     <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 opacity-70" />
                        <span>{repository.viewCount} views</span>
                    </div>
                )}
                 {repository.forkCount > 0 && (
                     <div className="flex items-center gap-1.5">
                        <GitFork className="w-4 h-4 opacity-70" />
                        <span>{repository.forkCount} forks</span>
                    </div>
                )}
            </div>
        </div>
    )
}
