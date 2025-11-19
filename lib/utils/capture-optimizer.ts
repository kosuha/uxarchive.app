"use client"

const MAX_DIMENSION = 2048
const TARGET_QUALITY = 0.82
const TARGET_EXTENSION = "webp"

export type CaptureOptimizationResult = {
  file: File
  width?: number
  height?: number
  optimized: boolean
}

type WorkerOptimizeResponse = {
  id: string
  success: boolean
  width?: number
  height?: number
  blob?: Blob
}

type WorkerOptimizeRequest = {
  id: string
  file: File
  maxDimension: number
  quality: number
}

let workerPromise: Promise<Worker | null> | null = null

const isBrowser = () => typeof window !== "undefined"

const isOptimizableImage = (file: File) => file.type.startsWith("image/") && !file.type.includes("svg")

const loadWorker = async (): Promise<Worker | null> => {
  if (!isBrowser() || typeof Worker === "undefined") {
    return null
  }

  if (workerPromise) {
    return workerPromise
  }

  workerPromise = new Promise((resolve) => {
    try {
      const worker = new Worker(new URL("../workers/capture-optimizer.worker.ts", import.meta.url), {
        type: "module",
      })
      resolve(worker)
    } catch (error) {
      console.warn("[capture-optimizer] Unable to initialize worker", error)
      resolve(null)
    }
  })

  return workerPromise
}

const generateRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const deriveFileName = (originalName: string, extension: string) => {
  const normalizedExt = extension.startsWith(".") ? extension : `.${extension}`
  if (!originalName) {
    return `capture-${Date.now()}${normalizedExt}`
  }
  const segments = originalName.split(".")
  if (segments.length === 1) {
    return `${originalName}${normalizedExt}`
  }
  segments.pop()
  return `${segments.join(".")}${normalizedExt}`
}

const requestWorkerOptimization = (worker: Worker, file: File): Promise<CaptureOptimizationResult | null> => {
  return new Promise((resolve) => {
    const requestId = generateRequestId()

    const cleanup = () => {
      worker.removeEventListener("message", handleMessage)
      worker.removeEventListener("error", handleError)
    }

    const handleMessage = async (event: MessageEvent<WorkerOptimizeResponse>) => {
      if (!event.data || event.data.id !== requestId) return
      cleanup()

      if (!event.data.success || !event.data.blob) {
        resolve(null)
        return
      }

      const optimizedFile = new File([event.data.blob], deriveFileName(file.name, TARGET_EXTENSION), {
        type: event.data.blob.type || `image/${TARGET_EXTENSION}`,
        lastModified: Date.now(),
      })

      resolve({
        file: optimizedFile,
        width: event.data.width,
        height: event.data.height,
        optimized: true,
      })
    }

    const handleError = () => {
      cleanup()
      resolve(null)
    }

    worker.addEventListener("message", handleMessage)
    worker.addEventListener("error", handleError)

    const payload: WorkerOptimizeRequest = {
      id: requestId,
      file,
      maxDimension: MAX_DIMENSION,
      quality: TARGET_QUALITY,
    }

    try {
      worker.postMessage(payload)
    } catch (error) {
      console.warn("[capture-optimizer] Failed to post message to worker", error)
      cleanup()
      resolve(null)
    }
  })
}

const optimizeWithCanvas = async (file: File): Promise<CaptureOptimizationResult | null> => {
  if (!isBrowser() || typeof document === "undefined") {
    return null
  }

  const image = await loadHtmlImage(file)
  if (!image) {
    return null
  }

  const { width, height } = clampDimensions(image.naturalWidth, image.naturalHeight, MAX_DIMENSION)
  const canvas = document.createElement("canvas")
  canvas.width = width || image.naturalWidth
  canvas.height = height || image.naturalHeight
  const context = canvas.getContext("2d")
  if (!context) {
    return null
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), `image/${TARGET_EXTENSION}`, TARGET_QUALITY)
  })

  if (!blob) {
    return null
  }

  const optimizedFile = new File([blob], deriveFileName(file.name, TARGET_EXTENSION), {
    type: blob.type || `image/${TARGET_EXTENSION}`,
    lastModified: Date.now(),
  })

  return {
    file: optimizedFile,
    width: canvas.width,
    height: canvas.height,
    optimized: true,
  }
}

const loadHtmlImage = (blob: Blob) => {
  if (!isBrowser()) {
    return Promise.resolve<HTMLImageElement | null>(null)
  }

  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!blob.type.startsWith("image/")) {
      resolve(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
    image.src = objectUrl
  })
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

export const measureImageDimensions = async (blob: Blob): Promise<{ width?: number; height?: number }> => {
  if (!isBrowser() || !blob.type.startsWith("image/")) {
    return {}
  }
  const image = await loadHtmlImage(blob)
  if (!image) {
    return {}
  }
  return {
    width: Math.round(image.naturalWidth),
    height: Math.round(image.naturalHeight),
  }
}

export const optimizeCaptureFile = async (file: File): Promise<CaptureOptimizationResult> => {
  if (!isOptimizableImage(file)) {
    const dimensions = await measureImageDimensions(file)
    return {
      file,
      ...dimensions,
      optimized: false,
    }
  }

  const worker = await loadWorker()
  if (worker) {
    const workerResult = await requestWorkerOptimization(worker, file)
    if (workerResult) {
      return workerResult
    }
  }

  const canvasResult = await optimizeWithCanvas(file)
  if (canvasResult) {
    return canvasResult
  }

  const fallbackDimensions = await measureImageDimensions(file)
  return {
    file,
    ...fallbackDimensions,
    optimized: false,
  }
}
