"use client"

import * as React from "react"

export function ContextMenuBlocker() {
  React.useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }
    window.addEventListener("contextmenu", handleContextMenu)
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [])

  return null
}
