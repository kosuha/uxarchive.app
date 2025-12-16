"use client"

import { RepositoryRecord } from "@/lib/repositories/repositories"
import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Calendar, Eye, GitFork } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface RepositoryHeaderProps {
    repository: RepositoryRecord
}

export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
    return (
        <div className="px-6 py-8 border-b border-border/40 space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {repository.name}
                    </h1>
                    <Badge variant="secondary" className="gap-1.5 h-6 px-2.5 font-normal text-muted-foreground">
                        {repository.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {repository.isPublic ? "Public" : "Private"}
                    </Badge>
                </div>
                
                {repository.description && (
                    <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
                        {repository.description}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 opacity-70" />
                    <span>Created {formatDistanceToNow(new Date(repository.createdAt), { addSuffix: true })}</span>
                </div>
                 {/* For now, we simulate stats or hide them if 0 to keep it clean, 
                     but let's show them if they exist in the types. */}
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
