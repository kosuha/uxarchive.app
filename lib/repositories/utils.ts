import type { PostgrestError } from "@supabase/supabase-js"

import { RepositoryError } from "./types"

type EnsureDataOptions = {
  notFoundStatus?: number
  fallbackMessage?: string
}

const toRepositoryError = (message: string, error?: PostgrestError | null, status = 400) => {
  throw new RepositoryError(error ? `${message}: ${error.message}` : message, {
    cause: error ?? undefined,
    code: error?.code,
    status,
  })
}

export const ensureData = <T>(
  data: T | null,
  error: PostgrestError | null,
  message: string,
  options?: EnsureDataOptions,
): T => {
  if (error) {
    toRepositoryError(options?.fallbackMessage ?? message, error)
  }
  if (data === null) {
    throw new RepositoryError(message, { status: options?.notFoundStatus ?? 404 })
  }
  return data
}

export const ensureSuccess = (error: PostgrestError | null, message: string) => {
  if (error) {
    toRepositoryError(message, error)
  }
}

export const mapBooleanResult = (
  data: boolean | null,
  error: PostgrestError | null,
  message: string,
): boolean => {
  if (error) {
    toRepositoryError(message, error)
  }
  if (data === null) {
    throw new RepositoryError(message)
  }
  return data
}
