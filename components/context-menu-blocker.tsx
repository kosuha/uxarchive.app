"use client"

import * as React from "react"

const ALLOW_ATTRIBUTE = "data-allow-context-menu"

export function ContextMenuBlocker() {
  React.useEffect(() => {
    const listenerOptions: AddEventListenerOptions = { capture: true }
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest(`[${ALLOW_ATTRIBUTE}]`)) {
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
