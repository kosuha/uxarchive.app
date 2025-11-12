"use client"

import type { ComponentProps } from "react"

import { ArchiveTreeSection } from "@/components/app-sidebar/archive-tree-section"

export type ExploreViewProps = ComponentProps<typeof ArchiveTreeSection>

export function ExploreView(props: ExploreViewProps) {
  return <ArchiveTreeSection {...props} />
}
