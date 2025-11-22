import * as React from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Tag } from "@/lib/types"

type TagBadgeProps = React.ComponentPropsWithoutRef<typeof Badge> & {
  tag: Tag
  showRemoveIcon?: boolean
}

export function TagBadge({ tag, className, showRemoveIcon, ...props }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        className
      )}
      style={
        tag.color
          ? {
              borderColor: tag.color,
              color: tag.color,
            }
          : undefined
      }
      {...props}
    >
      <span className="leading-none">{tag.label}</span>
      {showRemoveIcon && (
        <X className="text-current" aria-hidden />
      )}
    </Badge>
  )
}
