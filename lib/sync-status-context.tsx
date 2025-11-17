"use client"

import * as React from "react"
import { onlineManager, useQueryClient } from "@tanstack/react-query"

type SyncStatus = {
  isOnline: boolean
  pendingMutations: number
  failedMutations: number
  lastErrorMessage: string | null
  lastErrorMutationId: number | null
  retryAll: () => Promise<void>
  retrying: boolean
}

const defaultState: SyncStatus = {
  isOnline: true,
  pendingMutations: 0,
  failedMutations: 0,
  lastErrorMessage: null,
  lastErrorMutationId: null,
  retryAll: async () => {},
  retrying: false,
}

const SyncStatusContext = React.createContext<SyncStatus>(defaultState)

const toErrorMessage = (error: unknown) => {
  if (!error) return null
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return "An unknown error occurred."
  }
}

export const SyncStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient()
  const [state, setState] = React.useState<SyncStatus>(() => ({
    ...defaultState,
    isOnline: onlineManager.isOnline(),
  }))
  const retryingRef = React.useRef(false)
  const scheduleAsyncUpdate = React.useCallback(
    (updater: React.SetStateAction<SyncStatus>) => {
      const run = () => setState(updater)
      if (typeof queueMicrotask === "function") {
        queueMicrotask(run)
      } else {
        Promise.resolve().then(run)
      }
    },
    []
  )

  React.useEffect(() => {
    const unsubscribe = onlineManager.subscribe(() => {
      setState((prev) => ({
        ...prev,
        isOnline: onlineManager.isOnline(),
      }))
    })
    return () => {
      unsubscribe?.()
    }
  }, [])

  React.useEffect(() => {
    const mutationCache = queryClient.getMutationCache()

    const updateFromCache = (deferUpdate: boolean) => {
      const mutations = mutationCache.getAll()
      const pendingMutations = mutations.filter((mutation) => mutation.state.status === "pending" || mutation.state.isPaused)
        .length
      const failed = mutations.filter((mutation) => mutation.state.status === "error")
      const lastFailed = failed.at(-1) ?? null

      const nextState: React.SetStateAction<SyncStatus> = (prev) => ({
        ...prev,
        pendingMutations,
        failedMutations: failed.length,
        lastErrorMessage: lastFailed ? toErrorMessage(lastFailed.state.error) : null,
        lastErrorMutationId: lastFailed ? lastFailed.mutationId : null,
      })

      if (deferUpdate) {
        scheduleAsyncUpdate(nextState)
      } else {
        setState(nextState)
      }
    }

    updateFromCache(false)
    const unsubscribe = mutationCache.subscribe(() => updateFromCache(true))
    return () => unsubscribe()
  }, [queryClient, scheduleAsyncUpdate])

  const retryAll = React.useCallback(async () => {
    if (retryingRef.current) return
    retryingRef.current = true
    setState((prev) => ({ ...prev, retrying: true }))
    try {
      await queryClient.resumePausedMutations()
      await queryClient.refetchQueries({ type: "active" })
    } finally {
      retryingRef.current = false
      setState((prev) => ({ ...prev, retrying: false }))
    }
  }, [queryClient])

  const value = React.useMemo<SyncStatus>(
    () => ({
      ...state,
      retryAll,
    }),
    [state, retryAll]
  )

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>
}

export const useSyncStatus = () => {
  const context = React.useContext(SyncStatusContext)
  return context
}
