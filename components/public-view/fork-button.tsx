"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Copy, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { forkPatternAction } from "@/app/actions/fork-pattern"

interface ForkButtonProps {
    patternId: string
    isAuthenticated: boolean
}

export function ForkButton({ patternId, isAuthenticated }: ForkButtonProps) {
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
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={handleFork}
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                    Fork
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                Copy this pattern to your workspace
            </TooltipContent>
        </Tooltip>
    )
}
