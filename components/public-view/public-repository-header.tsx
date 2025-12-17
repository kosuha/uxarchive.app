"use client"

import * as React from "react"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { RepositoryFolderRecord } from "@/lib/repositories/repository-folders"
import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Calendar, Eye, GitFork, Folder, Heart, Copy, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
// import { toast } from "sonner" // Removed sonner
import { useToast } from "@/components/ui/use-toast"
import { Button } from "../ui/button"
import { toggleRepositoryLikeAction } from "@/app/actions/interactions"
import { forkRepositoryToDefaultAction, forkFolderToDefaultAction } from "@/app/actions/repositories"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

import { Loader2 } from "lucide-react"

interface PublicRepositoryHeaderProps {
    repository: RepositoryRecord
    folder?: RepositoryFolderRecord
    versions?: { id: string; name: string; createdAt: string }[]
    currentVersionId?: string | null
}

export function PublicRepositoryHeader({ repository, folder, versions = [], currentVersionId }: PublicRepositoryHeaderProps) {
    const router = useRouter()
    const { toast } = useToast()
    // Context: Folder vs Repo
    const description = folder ? (folder.description || "") : (repository.description || "")
    const title = folder ? folder.name : repository.name
    const creationDate = folder ? folder.createdAt : repository.createdAt
    const dateObj = new Date(creationDate)
    const isValidDate = !isNaN(dateObj.getTime())
    
    // Copy feedback state
    const [isCopied, setIsCopied] = React.useState(false)

    const handleCopyLink = () => {
        const url = `${window.location.origin}/share/r/${repository.id}`
        navigator.clipboard.writeText(url)
        toast({ description: "Link copied to clipboard" })
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }


    const [isLikePending, startLikeTransition] = React.useTransition()
    const [isForkPending, startForkTransition] = React.useTransition()
    // Local state for like visualization (optimistic/result-based)
    const [hasLiked, setHasLiked] = React.useState(false)

    const handleLike = () => {
        startLikeTransition(async () => {
            try {
                const result = await toggleRepositoryLikeAction(repository.id)
                setHasLiked(!!result)
                toast({ description: result ? "Repository liked" : "Repository unliked" })
            } catch (error) {
                toast({ description: "Failed to update like status", variant: "destructive" })
                console.error(error)
            }
        })
    }

    const handleFork = () => {
        startForkTransition(async () => {
            try {
                let result;
                if (folder) {
                    result = await forkFolderToDefaultAction({
                        sourceFolderId: folder.id,
                        sourceRepositoryId: repository.id,
                        name: `${folder.name} (Fork)`,
                        description: folder.description
                    })
                } else {
                    result = await forkRepositoryToDefaultAction({
                        sourceRepositoryId: repository.id,
                        name: `${repository.name} (Fork)`,
                        description: repository.description
                    })
                }
                
                if (result.error) {
                    if (result.error.includes("authenticated")) {
                        toast({ description: "Please sign in to fork", variant: "destructive" })
                    } else {
                        toast({ description: result.error, variant: "destructive" })
                    }
                    return
                }

                toast({ description: "Forked successfully" })
                if (result.data) {
                    window.open(`/workspace?repositoryId=${result.data.id}`, "_blank")
                }
            } catch (error) {
                console.error(error)
                toast({ description: "Failed to fork", variant: "destructive" })
            }
        })
    }

    return (
        <div className="px-6 py-8 border-b border-border/40 space-y-4">
            <div className="space-y-2">
                {!folder && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4 opacity-70" />
                            <span>{repository.viewCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <GitFork className="w-4 h-4 opacity-70" />
                            <span>{repository.forkCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Heart className="w-4 h-4 opacity-70" />
                            <span>{repository.likeCount}</span>
                        </div>
                    </div>
                )}
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


            <div className="flex flex-col items-start gap-4 text-sm text-muted-foreground">
                {isValidDate && (
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 opacity-70" />
                        <span>Created {formatDistanceToNow(dateObj, { addSuffix: true })}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    {!folder && versions.length > 0 && (
                        <Select
                            value={currentVersionId || "live"}
                            onValueChange={(val) => {
                                const url = new URL(window.location.href)
                                if (val === "live") {
                                    url.searchParams.delete("versionId")
                                } else {
                                    url.searchParams.set("versionId", val)
                                }
                                router.push(url.toString())
                            }}
                        >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="live">
                                    <span className="font-medium">Live (Latest)</span>
                                </SelectItem>
                                {versions.map((v) => {
                                    const vDate = new Date(v.createdAt)
                                    const isVDateValid = !isNaN(vDate.getTime())
                                    return (
                                        <SelectItem key={v.id} value={v.id}>
                                            <div className="flex flex-col items-start text-xs">
                                                <span className="font-medium">{v.name}</span>
                                                {isVDateValid && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {formatDistanceToNow(vDate, { addSuffix: true })}
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    )}
                    {!folder && (
                        <Button 
                            variant="outline" 
                            className={cn("w-24 gap-1.5 transition-colors", hasLiked && "text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600 dark:bg-red-950/20 dark:border-red-900/50")}
                            onClick={handleLike}
                            disabled={isLikePending}
                        >
                            {isLikePending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Heart className={cn("w-4 h-4", hasLiked && "fill-current")} />
                            )}
                            <span>{hasLiked ? "Liked" : "Like"}</span>
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        className="w-24 gap-1.5"
                        onClick={handleFork}
                        disabled={isForkPending}
                    >
                        {isForkPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitFork className="w-4 h-4" />}
                        <span>Fork</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
