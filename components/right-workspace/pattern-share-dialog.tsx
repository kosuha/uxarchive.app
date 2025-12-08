"use client"

import * as React from "react"
import { Check, Copy, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

const ENV_SHARE_BASE = process.env.NEXT_PUBLIC_SITE_URL
const DEFAULT_SHARE_BASE = "https://uxarchive.app"

function resolveShareBase() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }
  if (ENV_SHARE_BASE) {
    return ENV_SHARE_BASE
  }
  return DEFAULT_SHARE_BASE
}

type PatternShareDialogProps = {
  patternId: string
  patternName?: string
  isPublic: boolean
  published: boolean
  onToggleShare: (next: boolean) => Promise<void> | void
  onTogglePublish: (next: boolean) => Promise<void> | void
}

export function PatternShareDialog({
  patternId,
  patternName,
  isPublic,
  published,
  onToggleShare,
  onTogglePublish,
}: PatternShareDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const shareUrl = React.useMemo(() => {
    const base = resolveShareBase()
    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base
    return `${normalizedBase}/patterns/${patternId}`
  }, [patternId])

  const handleToggle = React.useCallback(
    async (checked: boolean) => {
      try {
        setPending(true)
        await onToggleShare(checked)
        if (!checked) {
          setCopied(false)
        }
      } catch (error) {
        console.error("Failed to toggle sharing", error)
        toast({
          title: "Could not update sharing",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        })
      } finally {
        setPending(false)
      }
    },
    [onToggleShare, toast],
  )

  const handleCopy = React.useCallback(async () => {
    if (!isPublic) return
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({
        title: "Clipboard unavailable",
        description: "Please try a modern browser or copy manually.",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({ title: "Link copied" })
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error("Failed to copy share url", error)
      toast({
        title: "Unable to copy",
        description: "Please try again or copy manually.",
        variant: "destructive",
      })
    }
  }, [isPublic, shareUrl, toast])

  const handleTogglePublish = React.useCallback(
    async (checked: boolean) => {
      if (!isPublic) return
      try {
        setPending(true)
        await onTogglePublish(checked)
      } catch (error) {
        console.error("Failed to toggle publish", error)
        toast({
          title: "Could not update publish state",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        })
      } finally {
        setPending(false)
      }
    },
    [isPublic, onTogglePublish, toast],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 size-3.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share pattern</DialogTitle>
          <DialogDescription>
            Anyone with the link can view {patternName ?? "this pattern"} without signing in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enable sharing</p>
              <p className="text-xs text-muted-foreground">Turn on to let anyone with the link view this pattern.</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={handleToggle} disabled={pending} aria-label="Toggle sharing" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Publish to listing</p>
              <p className="text-xs text-muted-foreground">Show this pattern on <a href="/patterns" className="underline">the public patterns page</a>.</p>
            </div>
            <Switch
              checked={published}
              onCheckedChange={handleTogglePublish}
              disabled={pending || !isPublic}
              aria-label="Toggle publish to listing"
            />
          </div>
          {isPublic ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Share link</p>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button type="button" onClick={handleCopy} variant="secondary" disabled={!isPublic}>
                  {copied ? <Check className="mr-2 size-3.5" /> : <Copy className="mr-2 size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <p className="text-xs text-muted-foreground">Disabling sharing immediately revokes the link.</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
