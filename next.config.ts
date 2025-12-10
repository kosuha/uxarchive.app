import type { NextConfig } from "next"
import type { RemotePattern } from "next/dist/shared/lib/image-config"

const DEFAULT_STORAGE_BUCKET = "ux-archive-captures"

const normalizeProtocol = (value?: string): RemotePattern["protocol"] => {
  if (!value) return undefined
  const normalized = value.replace(/:$/, "")
  return normalized === "http" || normalized === "https" ? normalized : undefined
}

const resolveRemotePatterns = (): RemotePattern[] => {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET
  const customEndpoint = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ENDPOINT?.trim()?.replace(/\/$/, "")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

  const patterns: RemotePattern[] = []

  if (customEndpoint) {
    try {
      const endpointUrl = new URL(customEndpoint)
      const basePath = endpointUrl.pathname.replace(/\/$/, "") || ""
      patterns.push({
        protocol: normalizeProtocol(endpointUrl.protocol),
        hostname: endpointUrl.hostname,
        pathname: `${basePath || "/"}/${bucket}/**`,
      })
      patterns.push({
        protocol: normalizeProtocol(endpointUrl.protocol),
        hostname: endpointUrl.hostname,
        pathname: `${basePath || "/"}/**`,
      })
    } catch {
      // ignore invalid custom endpoint
    }
  }

  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl)
      patterns.push({
        protocol: normalizeProtocol(parsed.protocol),
        hostname: parsed.hostname,
        pathname: "/storage/v1/**",
      })

      const storageHost = parsed.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co")
      patterns.push({
        protocol: "https",
        hostname: storageHost,
        pathname: "/storage/v1/**",
      })
      patterns.push({
        protocol: "https",
        hostname: storageHost,
        pathname: `/storage/v1/object/public/${bucket}/**`,
      })
      patterns.push({
        protocol: "https",
        hostname: storageHost,
        pathname: `/storage/v1/s3/${bucket}/**`,
      })
    } catch {
      // ignore invalid supabase URL
    }
  }

  if (patterns.length === 0) {
    patterns.push(
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" },
      { protocol: "https", hostname: "*.storage.supabase.co", pathname: "/storage/v1/**" },
    )
  }

  return patterns
}

const remotePatterns = resolveRemotePatterns()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remotePatterns.length ? remotePatterns : undefined,
    localPatterns: [
      {
        pathname: "/api/storage/object",
      },
      {
        pathname: "/**",
        search: "",
      },
    ],
  },
}

export default nextConfig
