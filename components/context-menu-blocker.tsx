"use client"

import * as React from "react"

import { CONTEXT_MENU_ALLOW_ATTRIBUTE } from "@/lib/context-menu"

export function ContextMenuBlocker() {
  React.useEffect(() => {
    const listenerOptions: AddEventListenerOptions = { capture: true }
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest(`[${CONTEXT_MENU_ALLOW_ATTRIBUTE}]`)) {
        return
      }
      event.preventDefault()
    }
    window.addEventListener("contextmenu", handleContextMenu, listenerOptions)
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, listenerOptions)
    }
  }, [])

  return null
}
