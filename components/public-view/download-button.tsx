"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface DownloadButtonProps {
    imageUrl?: string
    fileName?: string
    canDownload: boolean
    isAuthenticated: boolean
    className?: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function DownloadButton({
    imageUrl,
    fileName = "pattern-capture.png",
    canDownload,
    isAuthenticated,
    className,
    variant = "outline"
}: DownloadButtonProps) {
    const [isDownloading, setIsDownloading] = React.useState(false)
    const { toast } = useToast()

    const handleDownload = async () => {
        if (!isAuthenticated) {
            toast({
                title: "Authentication required",
                description: "Please sign in to download images.",
                variant: "destructive",
            })
            return
        }

        if (!canDownload) {
            toast({
                title: "Upgrade required",
                description: "Image downloads are available on the Plus plan.",
                variant: "destructive",
            })
            return
        }

        if (!imageUrl) return

        try {
            setIsDownloading(true)
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            toast({
                title: "Download failed",
                description: "Failed to download the image. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant={variant}
                    size="sm"
                    className={cn("h-8 gap-1.5", className)}
                    onClick={handleDownload}
                    disabled={!imageUrl || isDownloading}
                >
                    {isDownloading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Download className="h-3.5 w-3.5" />
                    )}
                    Download
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {canDownload ? "Download current image" : "Upgrade to Plus to download"}
            </TooltipContent>
        </Tooltip>
    )
}
