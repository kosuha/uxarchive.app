"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Copy, GitFork, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { forkPatternAction } from "@/app/actions/fork-pattern"
import { cn, formatCompactNumber } from "@/lib/utils"

interface ForkButtonProps {
    patternId: string
    isAuthenticated: boolean
    count?: number
    className?: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function ForkButton({
    patternId,
    isAuthenticated,
    count = 0,
    className,
    variant = "outline"
}: ForkButtonProps) {
    const [isPending, startTransition] = React.useTransition()
    const router = useRouter()
    const { toast } = useToast()

    const handleFork = () => {
        if (!isAuthenticated) {
            toast({
                title: "Authentication required",
                description: "Please sign in to fork patterns.",
                variant: "destructive",
            })
            // Optionally redirect to login
            router.push("/login")
            return
        }

        startTransition(async () => {
            try {
                const newPatternId = await forkPatternAction(patternId)
                toast({
                    title: "Forked successfully",
                    description: "Pattern has been copied to your workspace.",
                })
                router.push(`/workspace?patternId=${newPatternId}`)
            } catch (error) {
                toast({
                    title: "Fork failed",
                    description: error instanceof Error ? error.message : "Something went wrong.",
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
                        className="h-7 gap-1.5 rounded-r-none border-r-0 px-3"
                        onClick={handleFork}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <GitFork className="h-3.5 w-3.5" />
                        )}
                        <span className="font-semibold text-xs">Fork</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    Copy this pattern to your workspace
                </TooltipContent>
            </Tooltip>
            <div className={cn(
                "flex h-7 items-center border border-l-0 rounded-r-md px-2.5 text-xs font-semibold tabular-nums text-muted-foreground",
                variant === "outline" && "bg-background border-border dark:border-input dark:bg-input/30",
                variant === "secondary" && "bg-secondary/50",
                variant === "ghost" && "border-none bg-accent/30"
            )}>
                {formatCompactNumber(count)}
            </div>
        </div>
    )
}
