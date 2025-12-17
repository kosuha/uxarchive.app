"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"
import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Calendar, Eye, GitFork, ChevronDown, Folder, Heart, Copy, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { updateRepositoryAction } from "@/app/actions/repositories"
import { updateRepositoryFolderAction } from "@/app/actions/repository-folders"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useRepositoryData } from "@/components/repository-data-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
// import { toast } from "sonner" // Removed sonner
import { useToast } from "@/components/ui/use-toast"
import { SnapshotsDialog } from "@/components/snapshots-dialog"

interface RepositoryHeaderProps {
    repository: RepositoryRecord
    folder?: RepositoryFolderRecord
}

export function RepositoryHeader({ repository, folder }: RepositoryHeaderProps) {
    const { planData } = useRepositoryData()
    const limit = planData?.plan.limits.maxPrivateRepositories ?? Infinity
    const usage = planData?.usage.privateRepositories ?? 0
    const canCreatePrivate = usage < limit
    const { toast } = useToast()
    // Determine initial description based on context (folder vs repo)
    const initialDescription = folder ? (folder.description || "") : (repository.description || "")
    const initialTitle = folder ? folder.name : repository.name
    
    // Local state for description editing
    const [description, setDescription] = React.useState(initialDescription)
    // Local state for title editing
    const [titleState, setTitleState] = React.useState(initialTitle)
    // Copy feedback state
    const [isCopied, setIsCopied] = React.useState(false)

    // Sync local state when prop updates (e.g. navigation or re-fetch)
    React.useEffect(() => {
        const desc = folder ? (folder.description || "") : (repository.description || "")
        setDescription(desc)
        setTitleState(folder ? folder.name : repository.name)
    }, [folder, repository.description, repository.name])

    // Use QueryClient to invalidate cache after mutations
    const queryClient = useQueryClient()

    const handleDescriptionBlur = async () => {
        const currentDescription = folder ? (folder.description || "") : (repository.description || "")
        
        if (description !== currentDescription) {
            try {
                if (folder) {
                    await updateRepositoryFolderAction({
                        id: folder.id,
                        repositoryId: repository.id,
                        description: description
                    })
                    queryClient.invalidateQueries({ queryKey: ["repository-folders"] })
                } else {
                    await updateRepositoryAction({
                        id: repository.id,
                        workspaceId: repository.workspaceId,
                        description: description
                    })
                    queryClient.invalidateQueries({ queryKey: ["repositories"] })
                }
                toast({ description: "Description updated" })
            } catch (error) {
                toast({ description: "Failed to update description", variant: "destructive" })
                setDescription(currentDescription) // Revert
            }
        }
    }

    const handleVisibilityChange = async (isPublic: boolean) => {
        // Folder visibility is inherited for now, so this is only for repo
        if (folder) return 

        if (folder) return 


        if (!isPublic && !canCreatePrivate) {
            toast({ description: `You have reached the limit of ${limit} private repositories.`, variant: "destructive" })
            return
        }

        if (isPublic === repository.isPublic) return

        try {
            await updateRepositoryAction({
                id: repository.id,
                workspaceId: repository.workspaceId,
                isPublic: isPublic
            })
            queryClient.invalidateQueries({ queryKey: ["repositories"] })
            queryClient.invalidateQueries({ queryKey: ["plan-limits"] })
            toast({ description: `Repository is now ${isPublic ? 'Public' : 'Private'}` })
        } catch (error) {
            toast({ description: "Failed to update visibility", variant: "destructive" })
        }
    }

    const handleCopyLink = () => {
        const url = `${window.location.origin}/share/r/${repository.id}`
        navigator.clipboard.writeText(url)
        toast({ description: "Link copied to clipboard" })
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const handleTitleBlur = async () => {
        const currentTitle = folder ? folder.name : repository.name
        
        if (titleState !== currentTitle && titleState.trim() !== "") {
            try {
                if (folder) {
                    await updateRepositoryFolderAction({
                        id: folder.id,
                        repositoryId: repository.id,
                        name: titleState
                    })
                    queryClient.invalidateQueries({ queryKey: ["repository-folders"] })
                } else {
                    await updateRepositoryAction({
                        id: repository.id,
                        workspaceId: repository.workspaceId,
                        name: titleState
                    })
                    queryClient.invalidateQueries({ queryKey: ["repositories"] })
                }
                toast({ description: "Name updated" })
            } catch (error) {
                toast({ description: "Failed to update name", variant: "destructive" })
                setTitleState(currentTitle) // Revert
            }
        } else if (titleState.trim() === "") {
            setTitleState(currentTitle) // Revert if empty
        }
    }

    const title = folder ? folder.name : repository.name
    const creationDate = folder ? folder.createdAt : repository.createdAt




    const [showHistory, setShowHistory] = React.useState(false)

    return (
        <>
            <div className="px-6 py-8 border-b border-border/40 space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        {folder && <Folder className="w-6 h-6 text-muted-foreground/50 shrink-0" />}
                        <div className="flex-1 min-w-0">
                            <Input
                                value={titleState}
                                onChange={(e) => setTitleState(e.target.value)}
                                onBlur={handleTitleBlur}
                                className="text-2xl md:text-2xl font-semibold tracking-tight h-auto p-0 border-none hover:bg-transparent focus-visible:ring-0 px-1 -ml-1 w-full truncate shadow-none"
                            />
                        </div>
                        
                        {!folder && (
                            <div className="flex items-center gap-2 shrink-0">
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
                                        <DropdownMenuItem 
                                            onClick={() => handleVisibilityChange(false)}
                                            disabled={!canCreatePrivate && repository.isPublic}
                                        >
                                            <Lock className="w-4 h-4 mr-2" />
                                            Private
                                            {!canCreatePrivate && repository.isPublic && (
                                                <span className="ml-2 text-[10px] text-muted-foreground">(Limit Reached)</span>
                                            )}
                                        </DropdownMenuItem>
                                        {!canCreatePrivate && repository.isPublic && (
                                            <div className="px-2 py-1.5 text-xs text-muted-foreground w-64">
                                                Free plan is limited to {planData?.plan.limits.maxPrivateRepositories ?? 3} private repositories.
                                            </div>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-full transition-all duration-200"
                                    title="Version History"
                                >
                                    <Calendar className="w-3 h-3" />
                                    History
                                </button>

                                {repository.isPublic && (
                                    <button
                                        onClick={handleCopyLink}
                                        className={cn(
                                            "flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium rounded-full transition-all duration-200",
                                            isCopied 
                                                ? "text-green-600 bg-green-500/10 cursor-default" 
                                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                        )}
                                        title="Copy public link"
                                        disabled={isCopied}
                                    >
                                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {isCopied ? "Copied" : "Copy Link"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="max-w-2xl">
                        <Textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleDescriptionBlur}
                            placeholder={folder ? "Add a folder description..." : "Add a repository description..."}
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


                <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 opacity-70" />
                        <span>Created {formatDistanceToNow(new Date(creationDate), { addSuffix: true })}</span>
                    </div>
                    {!folder && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <Eye className="w-4 h-4 opacity-70" />
                                <span>{repository.viewCount} views</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <GitFork className="w-4 h-4 opacity-70" />
                                <span>{repository.forkCount} forks</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Heart className="w-4 h-4 opacity-70" />
                                <span>{repository.likeCount} likes</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <SnapshotsDialog 
                repositoryId={repository.id}
                repositoryName={repository.name}
                open={showHistory}
                onOpenChange={setShowHistory}
            />
        </>
    )
}
