"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Heart, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { toggleLikeAction } from "@/app/actions/interactions"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
    patternId: string
    isAuthenticated: boolean
    initialIsLiked: boolean
    initialCount: number
}

export function LikeButton({ patternId, isAuthenticated, initialIsLiked, initialCount }: LikeButtonProps) {
    const [isPending, startTransition] = React.useTransition()
    const router = useRouter()
    const { toast } = useToast()

    // Optimistic state
    const [isLiked, setIsLiked] = React.useOptimistic<boolean, boolean>(
        initialIsLiked,
        (_, newState) => newState
    )
    const [count, setCount] = React.useOptimistic<number, number>(
        initialCount,
        (_, newCount) => newCount
    )

    const handleLike = () => {
        if (!isAuthenticated) {
            toast({
                title: "Authentication required",
                description: "Please sign in to like patterns.",
                variant: "destructive",
            })
            router.push("/login")
            return
        }

        const nextIsLiked = !isLiked
        const nextCount = count + (nextIsLiked ? 1 : -1)

        React.startTransition(() => {
            setIsLiked(nextIsLiked)
            setCount(nextCount)
        })

        startTransition(async () => {
            try {
                await toggleLikeAction(patternId)
            } catch (error) {
                // Revert optimistic update (this is tricky with startTransition, simpler to just rely on revalidation or toast error)
                // UseTransition doesn't automatically revert optimistic state if async fails unless we handle it.
                // But useOptimistic is tied to the state passed in usually? 
                // Actually next/navigation router.refresh() from server action revalidates props.
                // If error, we might be out of sync until refresh.
                toast({
                    title: "Action failed",
                    description: "Failed to update like status.",
                    variant: "destructive",
                })
            }
        })
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-8 gap-1.5 min-w-[70px]", isLiked && "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900")}
                    onClick={handleLike}
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                    )}
                    <span className="tabular-nums">{count}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {isLiked ? "Unlike this pattern" : "Like this pattern"}
            </TooltipContent>
        </Tooltip>
    )
}
