import { useEffect, useSyncExternalStore } from "react"

import { initMockDataStorage } from "./mock-data"
import { getStorageSnapshot, subscribeToStorage } from "./storage"
import type { StorageCollectionKey, StorageCollections } from "./types"

const SUBSCRIPTION_KEYS: StorageCollectionKey[] = ["folders", "patterns", "captures", "insights", "tags"]

const EMPTY_SNAPSHOT: StorageCollections = {
  patterns: [],
  folders: [],
  captures: [],
  insights: [],
  tags: [],
}

let clientSnapshot: StorageCollections = getStorageSnapshot()
let storageUnsubscribers: Array<() => void> | null = null
const storeListeners = new Set<() => void>()

const notifyStoreListeners = () => {
  storeListeners.forEach((listener) => listener())
}

const ensureStorageSubscriptions = () => {
  if (typeof window === "undefined" || storageUnsubscribers) return

  storageUnsubscribers = SUBSCRIPTION_KEYS.map((key) =>
    subscribeToStorage(key, (value) => {
      clientSnapshot = {
        ...clientSnapshot,
        [key]: value,
      }
      notifyStoreListeners()
    }),
  )
}

const cleanupStorageSubscriptions = () => {
  if (!storageUnsubscribers) return
  storageUnsubscribers.forEach((unsubscribe) => unsubscribe())
  storageUnsubscribers = null
}

const subscribeToCollections = (listener: () => void) => {
  storeListeners.add(listener)
  ensureStorageSubscriptions()
  return () => {
    storeListeners.delete(listener)
    if (storeListeners.size === 0) {
      cleanupStorageSubscriptions()
    }
  }
}

export const useStorageCollections = () => {
  useEffect(() => {
    initMockDataStorage()
  }, [])

  const getClientSnapshot = () => clientSnapshot
  const getServerSnapshot = () => EMPTY_SNAPSHOT

  return useSyncExternalStore(subscribeToCollections, getClientSnapshot, getServerSnapshot)
}
