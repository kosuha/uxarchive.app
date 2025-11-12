"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyPlaceholderProps = {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  actionLabel?: string
  onActionClick?: () => void
  className?: string
}

export function EmptyPlaceholder({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick,
  className,
}: EmptyPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center border-t border-border/60",
        "bg-muted/20 p-6 text-center",
        className
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-3">
        {Icon && (
          <div className="rounded-full bg-background p-3 shadow">
            <Icon className="size-6 text-foreground" />
          </div>
        )}
        <div>
          <p className="text-base font-medium text-foreground">{title}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actionLabel && (
          <Button variant="outline" onClick={onActionClick} size="sm">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
