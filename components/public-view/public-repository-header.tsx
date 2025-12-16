"use client"

import * as React from "react"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"
import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Calendar, Eye, GitFork, Folder, Heart, Copy } from "lucide-react"
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
                            <Badge 
                                variant="secondary" 
                                className={cn(
                                    "gap-1.5 h-6 px-2.5 font-normal text-muted-foreground cursor-default",
                                    repository.isPublic ? "text-green-600 bg-green-500/10" : ""
                                )}
                            >
                                {repository.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {repository.isPublic ? "Public" : "Private"}
                            </Badge>

                            {repository.isPublic && (
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/share/r/${repository.id}`
                                        navigator.clipboard.writeText(url)
                                        toast.success("Link copied to clipboard")
                                    }}
                                    className="flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-full transition-colors"
                                    title="Copy public link"
                                >
                                    <Copy className="w-3 h-3" />
                                    Copy Link
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
