import * as React from "react"

import type { Capture } from "@/lib/types"

const CACHE_WINDOW_SIZE = 7
const CACHE_RADIUS = Math.floor(CACHE_WINDOW_SIZE / 2)
const MAX_CAPTURE_IMAGE_CACHE = CACHE_WINDOW_SIZE
const captureImageCache = new Map<string, HTMLImageElement>()

const getCachedImage = (url: string) => {
  const cached = captureImageCache.get(url)
  if (!cached) return null
  captureImageCache.delete(url)
  captureImageCache.set(url, cached)
  return cached
}

const putCachedImage = (url: string, image: HTMLImageElement) => {
  if (captureImageCache.has(url)) {
    captureImageCache.delete(url)
  } else if (captureImageCache.size >= MAX_CAPTURE_IMAGE_CACHE) {
    const oldestKey = captureImageCache.keys().next().value
    if (oldestKey) {
      captureImageCache.delete(oldestKey)
    }
  }
  captureImageCache.set(url, image)
}

const pickCacheWindow = (captures: Capture[], activeId?: string): Capture[] => {
  if (!activeId || captures.length === 0) return []

  const activeIndex = captures.findIndex((capture) => capture.id === activeId)
  if (activeIndex === -1) return []

  const maxWindow = Math.min(CACHE_WINDOW_SIZE, captures.length)
  let start = activeIndex - CACHE_RADIUS
  let end = activeIndex + CACHE_RADIUS

  if (start < 0) {
    end = Math.min(end + Math.abs(start), captures.length - 1)
    start = 0
  }

  if (end >= captures.length) {
    const overshoot = end - captures.length + 1
    start = Math.max(0, start - overshoot)
    end = captures.length - 1
  }

  const window: Capture[] = []
  for (let index = start; index <= end && window.length < maxWindow; index++) {
    window.push(captures[index])
  }

  return window
}

export function usePrefetchCaptureImages(captures: Capture[], activeId?: string) {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!activeId || captures.length === 0) return

    const windowCaptures = pickCacheWindow(captures, activeId)
    const targetUrls = new Set(
      windowCaptures
        .map((capture) => capture.imageUrl?.trim())
        .filter((url): url is string => Boolean(url))
    )

    for (const key of Array.from(captureImageCache.keys())) {
      if (!targetUrls.has(key)) {
        captureImageCache.delete(key)
      }
    }

    const listeners: Array<{ img: HTMLImageElement; handleLoad: () => void; handleError: () => void }> = []

    targetUrls.forEach((url) => {
      const cached = getCachedImage(url)
      if (cached && cached.complete && cached.naturalWidth > 0) {
        return
      }

      const img = new window.Image()
      img.crossOrigin = "anonymous"
      img.src = url

      const handleLoad = () => putCachedImage(url, img)
      const handleError = () => {
        captureImageCache.delete(url)
      }

      img.addEventListener("load", handleLoad)
      img.addEventListener("error", handleError)
      listeners.push({ img, handleLoad, handleError })
    })

    return () => {
      listeners.forEach(({ img, handleLoad, handleError }) => {
        img.removeEventListener("load", handleLoad)
        img.removeEventListener("error", handleError)
      })
    }
  }, [captures, activeId])
}

export function useCachedImage(url?: string) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined
    if (!url) {
      setImage(null)
      return undefined
    }

    const cached = getCachedImage(url)
    if (cached && cached.complete && cached.naturalWidth > 0) {
      setImage(cached)
      return undefined
    }

    let isMounted = true
    const img = cached ?? new window.Image()
    img.crossOrigin = "anonymous"
    if (!cached) {
      img.src = url
    }

    const handleLoad = () => {
      if (!isMounted) return
      putCachedImage(url, img)
      setImage(img)
    }

    const handleError = () => {
      if (!isMounted) return
      setImage(null)
    }

    if (img.complete && img.naturalWidth > 0) {
      handleLoad()
    } else {
      img.addEventListener("load", handleLoad)
      img.addEventListener("error", handleError)
    }

    return () => {
      isMounted = false
      img.removeEventListener("load", handleLoad)
      img.removeEventListener("error", handleError)
    }
  }, [url])

  return image
}
