import type { SupabaseClient } from "@supabase/supabase-js"

export type SupabaseRepositoryClient = SupabaseClient

type RepositoryErrorOptions = {
  cause?: unknown
  code?: string
  status?: number
}

export class RepositoryError extends Error {
  readonly code?: string
  readonly status?: number

  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = "RepositoryError"
    this.code = options?.code
    this.status = options?.status
  }
}

export type RepositoryQueryOptions = {
  signal?: AbortSignal
}
