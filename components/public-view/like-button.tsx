"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Heart, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { toggleLikeAction } from "@/app/actions/interactions"
import { cn, formatCompactNumber } from "@/lib/utils"

interface LikeButtonProps {
    patternId: string
    isAuthenticated: boolean
    initialIsLiked: boolean
    initialCount: number
    className?: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function LikeButton({
    patternId,
    isAuthenticated,
    initialIsLiked,
    initialCount,
    className,
    variant = "outline"
}: LikeButtonProps) {
    const [isPending, startTransition] = React.useTransition()
    const router = useRouter()
    const pathname = usePathname()
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
            router.push(`/login?next=${encodeURIComponent(pathname)}`)
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
                toast({
                    title: "Action failed",
                    description: "Failed to update like status.",
                    variant: "destructive",
                })
            }
        })
    }

    return (
        <div className={cn("inline-flex items-center", className)}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={variant}
                        size="sm"
                        className={cn(
                            "h-7 gap-1.5 rounded-r-none border-r-0 px-3",
                            isLiked && variant === "outline" && "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900",
                            isLiked && variant === "ghost" && "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        )}
                        onClick={handleLike}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                        )}
                        <span className="font-semibold text-xs">Like</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {isLiked ? "Unlike this pattern" : "Like this pattern"}
                </TooltipContent>
            </Tooltip>
            <div className={cn(
                "flex h-7 items-center border border-l-0 rounded-r-md px-2.5 text-xs font-semibold tabular-nums text-muted-foreground",
                variant === "outline" && "bg-background border-border dark:border-input dark:bg-input/30",
                variant === "secondary" && "bg-secondary/50",
                variant === "ghost" && "border-none bg-accent/30",
                isLiked && variant === "outline" && "border-red-200 bg-red-50/50 text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
            )}>
                {formatCompactNumber(count)}
            </div>
        </div>
    )
}
