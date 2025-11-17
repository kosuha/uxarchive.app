import type { Tag } from "./types"

export const DEFAULT_TAG_COLOR = "#6366F1"

export const TAG_TYPE_LABELS: Record<Tag["type"], string> = {
  "service-category": "Service",
  "pattern-type": "Pattern",
  custom: "Custom",
}

export const TAG_TYPE_OPTIONS = (Object.entries(TAG_TYPE_LABELS) as [Tag["type"], string][]).map(
  ([value, label]) => ({ value, label })
)
