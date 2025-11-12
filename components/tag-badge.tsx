import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Tag } from "@/lib/types"

type TagBadgeProps = React.ComponentPropsWithoutRef<typeof Badge> & {
  tag: Tag
}

export function TagBadge({ tag, className, ...props }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", className)}
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
      {tag.label}
    </Badge>
  )
}
