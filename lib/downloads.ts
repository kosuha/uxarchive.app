const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]+/g
const WHITESPACE_CHARS = /\s+/g

const sanitizeToken = (value: string) =>
  value.trim().replace(INVALID_FILENAME_CHARS, "").replace(WHITESPACE_CHARS, "-")

export const sanitizeFilename = (value: string, fallback = "download") => {
  const sanitized = sanitizeToken(value)
  return sanitized || fallback
}

const inferExtensionFromMime = (mime?: string | null) => {
  if (!mime) return undefined
  const [type, subtype] = mime.split("/")
  if (!type || !subtype) return undefined
  if (type !== "image") return subtype.split(";")[0]
  const normalizedSubtype = subtype.split(";")[0]
  switch (normalizedSubtype) {
    case "jpeg":
      return "jpg"
    default:
      return normalizedSubtype
  }
}

const ensureExtension = (filename: string, extension?: string) => {
  if (!extension) return filename
  if (filename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    return filename
  }
  return `${filename}.${extension}`
}

const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === "undefined") {
    throw new Error("Downloads are not available during SSR.")
  }
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = blobUrl
  anchor.download = filename
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(blobUrl)
}

const fetchBlobFromUrl = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = new Error(`Failed to download resource (${response.status})`)
    ;(error as { status?: number }).status = response.status
    throw error
  }
  const blob = await response.blob()
  const mimeType = response.headers.get("content-type") || blob.type || undefined
  return {
    blob,
    extension: inferExtensionFromMime(mimeType),
  }
}

export const downloadRemoteImage = async (url: string, filename: string) => {
  const normalizedFilename = sanitizeFilename(filename)
  const { blob, extension } = await fetchBlobFromUrl(url)
  downloadBlob(blob, ensureExtension(normalizedFilename, extension ?? "png"))
}

type JsZipModule = typeof import("jszip")

let jsZipModulePromise: Promise<{ default: JsZipModule }> | null = null

const getJsZipModule = () => {
  if (!jsZipModulePromise) {
    jsZipModulePromise = import("jszip") as Promise<{ default: JsZipModule }>
  }
  return jsZipModulePromise
}

export type ZipEntry = {
  url: string
  filename: string
}

export const downloadZipFromUrls = async (entries: ZipEntry[], archiveName: string) => {
  if (!entries.length) {
    throw new Error("No entries to download")
  }

  const JSZip = (await getJsZipModule()).default
  const zip = new JSZip()

  await Promise.all(
    entries.map(async (entry, index) => {
      const baseName = sanitizeFilename(entry.filename || `capture-${index + 1}`)
      const { blob, extension } = await fetchBlobFromUrl(entry.url)
      zip.file(ensureExtension(baseName, extension ?? "png"), blob)
    })
  )

  const archiveBlob = await zip.generateAsync({ type: "blob" })
  const normalizedArchiveName = ensureExtension(sanitizeFilename(archiveName), "zip")
  downloadBlob(archiveBlob, normalizedArchiveName)
}
