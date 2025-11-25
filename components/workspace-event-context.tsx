"use client"

import { useEffect } from "react"

import { setClientEventContext } from "@/lib/notifications/client-events"
import { useWorkspaceData } from "@/lib/workspace-data-context"

export function WorkspaceEventContext() {
  const { workspaceId } = useWorkspaceData()

  useEffect(() => {
    setClientEventContext({ workspaceId })
  }, [workspaceId])

  return null
}
