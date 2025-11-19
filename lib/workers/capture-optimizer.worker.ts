/// <reference lib="webworker" />

const TARGET_MIME_TYPE = "image/webp"
const FALLBACK_MIME_TYPE = "image/png"
const DEFAULT_MAX_DIMENSION = 2048
const DEFAULT_QUALITY = 0.82

type OptimizeRequest = {
  id: string
  file: File
  maxDimension?: number
  quality?: number
}

type OptimizeResponse = {
  id: string
  success: boolean
  width?: number
  height?: number
  blob?: Blob
  reason?: string
}

const clampDimensions = (width: number, height: number, maxDimension: number) => {
  if (!width || !height || maxDimension <= 0) {
    return { width, height }
  }
  const largestSide = Math.max(width, height)
  if (largestSide <= maxDimension) {
    return { width, height }
  }
  const scale = maxDimension / largestSide
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

const optimizeBitmap = async (bitmap: ImageBitmap, options: { maxDimension: number; quality: number }) => {
  const { width, height } = clampDimensions(bitmap.width, bitmap.height, options.maxDimension)
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("OffscreenCanvas is not supported")
  }
  const canvas = new OffscreenCanvas(width || bitmap.width, height || bitmap.height)
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Unable to create canvas context")
  }
  const targetWidth = width || bitmap.width
  const targetHeight = height || bitmap.height
  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

  let blob: Blob | null = null
  try {
    blob = await canvas.convertToBlob({ type: TARGET_MIME_TYPE, quality: options.quality })
  } catch {
    blob = await canvas.convertToBlob({ type: FALLBACK_MIME_TYPE })
  }

  if (!blob) {
    throw new Error("Unable to convert canvas to blob")
  }

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
  }
}

self.addEventListener("message", async (event: MessageEvent<OptimizeRequest>) => {
  const data = event.data
  const { id, file } = data
  const maxDimension = data.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = data.quality ?? DEFAULT_QUALITY

  if (!file.type.startsWith("image/")) {
    const response: OptimizeResponse = { id, success: false, reason: "unsupported-type" }
    self.postMessage(response)
    return
  }

  if (typeof createImageBitmap === "undefined") {
    const response: OptimizeResponse = { id, success: false, reason: "bitmap-unsupported" }
    self.postMessage(response)
    return
  }

  try {
    const bitmap = await createImageBitmap(file)
    const result = await optimizeBitmap(bitmap, { maxDimension, quality })
    bitmap.close?.()
    const response: OptimizeResponse = {
      id,
      success: true,
      width: result.width,
      height: result.height,
      blob: result.blob,
    }
    self.postMessage(response)
  } catch (error) {
    const response: OptimizeResponse = {
      id,
      success: false,
      reason: error instanceof Error ? error.message : "unknown-error",
    }
    self.postMessage(response)
  }
})
