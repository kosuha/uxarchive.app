import type { NextConfig } from "next"
import type { RemotePattern } from "next/dist/shared/lib/image-config"

const DEFAULT_STORAGE_BUCKET = "ux-archive-captures"

const normalizeProtocol = (value?: string): RemotePattern["protocol"] => {
  if (!value) return undefined
  const normalized = value.replace(/:$/, "")
  return normalized === "http" || normalized === "https" ? normalized : undefined
}

const resolveStorageRemotePattern = (): RemotePattern | null => {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET
  const customEndpoint = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ENDPOINT?.trim()?.replace(/\/$/, "")

  if (customEndpoint) {
    try {
      const endpointUrl = new URL(customEndpoint)
      const pathname = `${endpointUrl.pathname.replace(/\/$/, "") || ""}/${bucket}/**`
      return {
        protocol: normalizeProtocol(endpointUrl.protocol),
        hostname: endpointUrl.hostname,
        pathname: pathname.startsWith("/") ? pathname : `/${pathname}`,
      }
    } catch {
      // ignore invalid custom endpoint
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!supabaseUrl) return null

  try {
    const parsed = new URL(supabaseUrl)
    const storageHost = parsed.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co")
    return {
      protocol: "https",
      hostname: storageHost,
      pathname: `/storage/v1/s3/${bucket}/**`,
    }
  } catch {
    return null
  }
}

const storageRemotePattern = resolveStorageRemotePattern()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: storageRemotePattern ? [storageRemotePattern] : undefined,
    localPatterns: [
      {
        pathname: "/api/storage/object",
      },
    ],
  },
}

export default nextConfig
