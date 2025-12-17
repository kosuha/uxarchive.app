"use client"

import * as React from "react"
import { Heart, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { toggleRepositoryLikeAction } from "@/app/actions/interactions"
import { cn, formatCompactNumber } from "@/lib/utils"
import { useSupabaseSession } from "@/lib/supabase/session-context"
import { useQuery } from "@tanstack/react-query"
import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client"

interface RepositoryLikeButtonProps {
    repositoryId: string
    initialCount: number
    className?: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function RepositoryLikeButton({
    repositoryId,
    initialCount,
    className,
    variant = "ghost"
}: RepositoryLikeButtonProps) {
    const { user, loading: sessionLoading } = useSupabaseSession()
    const [isPending, startTransition] = React.useTransition()
    const supabase = getBrowserSupabaseClient()
    const { toast } = useToast()

    // Fetch initial liked status
    const { data: initialIsLiked = false, isLoading: isLikeStatusLoading } = useQuery({
        queryKey: ["repository-like-status", repositoryId, user?.id],
        queryFn: async () => {
            if (!user) return false
            const { data, error } = await supabase
                .from("repository_likes")
                .select("repository_id") // minimized select
                .eq("repository_id", repositoryId)
                .eq("user_id", user.id)
                .maybeSingle()
            
            if (error) return false
            return !!data
        },
        enabled: !!user && !sessionLoading
    })

    // Optimistic state
    const [isLiked, setIsLiked] = React.useOptimistic<boolean, boolean>(
        initialIsLiked,
        (_, newState) => newState
    )
    const [count, setCount] = React.useOptimistic<number, number>(
        initialCount,
        (_, newCount) => newCount
    )

    // Sync optimistic state with fetched data when it loads
    // Note: useOptimistic is for mutations, but we also want to respect the fetched initial state.
    // However, useOptimistic resets when the prop changes. Here "initialIsLiked" is from React Query.
    // We need a wrapper or useEffect to sync.
    // Actually, simplest is to use local state initialized with prop, then optimistic on top?
    // Or just use local state + manual rollback on error.
    
    // Better approach:
    // 1. Core state is from useQuery (server truth).
    // 2. Local mutation state (optimistic).
    
    // Let's stick to standard pattern: local state initialized/synced with query, + optimistic update.
    const [likedState, setLikedState] = React.useState(initialIsLiked)
    const [countState, setCountState] = React.useState(initialCount)

    React.useEffect(() => {
        setLikedState(initialIsLiked)
    }, [initialIsLiked])

    React.useEffect(() => {
        setCountState(initialCount)
    }, [initialCount])

    const handleLike = () => {
        if (!user) {
            toast({
                description: "Please sign in to like repositories",
                variant: "destructive",
            })
            return
        }

        const nextIsLiked = !likedState
        const nextCount = countState + (nextIsLiked ? 1 : -1)

        // Optimistic update
        setLikedState(nextIsLiked)
        setCountState(nextCount)

        startTransition(async () => {
            try {
                await toggleRepositoryLikeAction(repositoryId)
                toast({ description: nextIsLiked ? "Repository liked" : "Repository unliked" })
            } catch (error) {
                toast({
                    description: "Failed to update like status",
                    variant: "destructive",
                })
                // Revert
                setLikedState(!nextIsLiked)
                setCountState(initialCount) // approximate revert, ideally decrement/increment back
            }
        })
    }
    
    // Determine loading state
    const isLoading = sessionLoading || isLikeStatusLoading

    return (
        <div className={cn("inline-flex items-center gap-1.5", className)}>
             <Button
                variant={variant}
                size="sm"
                className={cn(
                    "h-6 gap-1.5 px-2 font-normal text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors",
                    likedState && "text-red-500 bg-red-500/10",
                    className
                )}
                onClick={handleLike}
                disabled={isPending || isLoading}
            >
                <Heart className={cn("w-4 h-4", likedState && "fill-current")} />
                <span>{formatCompactNumber(countState)}</span>
            </Button>
        </div>
    )
}
