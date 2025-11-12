import type { Tag } from "./types"

export const DEFAULT_TAG_COLOR = "#6366F1"

export const TAG_TYPE_LABELS: Record<Tag["type"], string> = {
  "service-category": "서비스",
  "pattern-type": "패턴",
  custom: "커스텀",
}

export const TAG_TYPE_OPTIONS = (Object.entries(TAG_TYPE_LABELS) as [Tag["type"], string][]).map(
  ([value, label]) => ({ value, label })
)
