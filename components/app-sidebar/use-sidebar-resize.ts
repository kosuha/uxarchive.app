"use client"

import * as React from "react"

import { Sidebar } from "@/components/ui/sidebar"

const SIDEBAR_MIN_WIDTH = 240
const SIDEBAR_MAX_WIDTH = 480
const SIDEBAR_DEFAULT_WIDTH = 320
const RESIZE_HANDLE_WIDTH = 8
const LIVE_WIDTH_CSS_VAR = "--app-sidebar-live-width"

type UseSidebarResizeOptions = {
  side: React.ComponentProps<typeof Sidebar>["side"]
  incomingStyle?: React.CSSProperties
  isMobile: boolean
  isCollapsed: boolean
  navOffsetValue: string
}

type UseSidebarResizeResult = {
  sidebarStyle: React.CSSProperties & Record<string, string | number>
  isResizing: boolean
  resizerStyle: React.CSSProperties
  handleRef: React.RefObject<HTMLDivElement | null>
  handleResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void
}

export function useSidebarResize({
  side,
  incomingStyle,
  isMobile,
  isCollapsed,
  navOffsetValue,
}: UseSidebarResizeOptions): UseSidebarResizeResult {
  const [sidebarWidth, setSidebarWidth] = React.useState(SIDEBAR_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = React.useState(false)
  const resizeStateRef = React.useRef({ startX: 0, startWidth: SIDEBAR_DEFAULT_WIDTH })
  const liveWidthRef = React.useRef(SIDEBAR_DEFAULT_WIDTH)
  const handleRef = React.useRef<HTMLDivElement | null>(null)

  const getHandleStyle = React.useCallback(
    (width: number): React.CSSProperties => {
      const offset = RESIZE_HANDLE_WIDTH / 2
      if (side === "right") {
        return { right: `${width - offset}px`, width: RESIZE_HANDLE_WIDTH }
      }
      const basePosition = `${width - offset}px`
      return {
        left: isMobile ? basePosition : `calc(${navOffsetValue} + ${basePosition})`,
        width: RESIZE_HANDLE_WIDTH,
      }
    },
    [isMobile, navOffsetValue, side]
  )

  const resolveCssValue = (value?: string | number) => {
    if (typeof value === "number") {
      return `${value}px`
    }
    return value
  }

  const applyWidthStyles = React.useCallback(
    (width: number) => {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(LIVE_WIDTH_CSS_VAR, `${width}px`)
      }
      const handleEl = handleRef.current
      if (handleEl) {
        const handleStyle = getHandleStyle(width)
        const resolvedWidth = resolveCssValue(handleStyle.width) ?? `${RESIZE_HANDLE_WIDTH}px`
        handleEl.style.width = resolvedWidth
        const leftValue = resolveCssValue(handleStyle.left)
        const rightValue = resolveCssValue(handleStyle.right)
        if (leftValue !== undefined) {
          handleEl.style.left = leftValue
          handleEl.style.right = ""
        } else if (rightValue !== undefined) {
          handleEl.style.right = rightValue
          handleEl.style.left = ""
        }
      }
    },
    [getHandleStyle]
  )

  React.useEffect(() => {
    liveWidthRef.current = sidebarWidth
    applyWidthStyles(sidebarWidth)
  }, [applyWidthStyles, sidebarWidth])

  React.useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.style.removeProperty(LIVE_WIDTH_CSS_VAR)
      }
    }
  }, [])

  const handleResizeStart = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: liveWidthRef.current,
    }
    setIsResizing(true)
  }, [])

  React.useEffect(() => {
    if (!isResizing) return

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - resizeStateRef.current.startX
      const adjustedDelta = side === "right" ? -delta : delta
      const nextWidth = clamp(
        resizeStateRef.current.startWidth + adjustedDelta,
        SIDEBAR_MIN_WIDTH,
        SIDEBAR_MAX_WIDTH
      )
      liveWidthRef.current = nextWidth
      applyWidthStyles(nextWidth)
    }

    const stopResizing = () => {
      setIsResizing(false)
      setSidebarWidth(liveWidthRef.current)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopResizing)
    window.addEventListener("pointercancel", stopResizing)

    const previousUserSelect = document.body.style.userSelect
    const previousCursor = document.body.style.cursor
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopResizing)
      window.removeEventListener("pointercancel", stopResizing)
      document.body.style.userSelect = previousUserSelect
      document.body.style.cursor = previousCursor
    }
  }, [applyWidthStyles, isResizing, side])

  const sidebarStyle = React.useMemo(() => {
    const styleObject = {
      ...(incomingStyle ?? {}),
      "--sidebar-width": `var(${LIVE_WIDTH_CSS_VAR}, ${sidebarWidth}px)`,
      "--nav-rail-width": navOffsetValue,
    } as React.CSSProperties & Record<string, string | number>

    if (isCollapsed) {
      styleObject["--sidebar-collapsed-width"] = "0px"
    }

    return styleObject
  }, [incomingStyle, isCollapsed, navOffsetValue, sidebarWidth])

  const resizerStyle = React.useMemo(() => getHandleStyle(sidebarWidth), [getHandleStyle, sidebarWidth])

  return {
    sidebarStyle,
    isResizing,
    resizerStyle,
    handleRef,
    handleResizeStart,
  }
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}
