"use client"

import * as React from "react"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"
import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Calendar, Eye, GitFork, Folder, Heart, Copy, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PublicRepositoryHeaderProps {
    repository: RepositoryRecord
    folder?: RepositoryFolderRecord
}

export function PublicRepositoryHeader({ repository, folder }: PublicRepositoryHeaderProps) {
    // Context: Folder vs Repo
    const description = folder ? (folder.description || "") : (repository.description || "")
    const title = folder ? folder.name : repository.name
    const creationDate = folder ? folder.createdAt : repository.createdAt
    
    // Copy feedback state
    const [isCopied, setIsCopied] = React.useState(false)

    const handleCopyLink = () => {
        const url = `${window.location.origin}/share/r/${repository.id}`
        navigator.clipboard.writeText(url)
        toast.success("Link copied to clipboard")
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="px-6 py-8 border-b border-border/40 space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        {folder && <Folder className="w-6 h-6 text-muted-foreground/50" />}
                        {title}
                    </h1>
                    
                    {!folder && (
                        <div className="flex items-center gap-2">
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
                    {description && (
                        <p className="text-base leading-relaxed text-muted-foreground min-h-[40px] py-1">{description}</p>
                    )}
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
    )
}
