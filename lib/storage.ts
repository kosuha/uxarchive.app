import type { IdentifiableEntity, StorageCollectionKey, StorageCollections } from "./types"

export const LOCAL_STORAGE_KEYS: Record<StorageCollectionKey, string> = {
  patterns: "uxarchive_patterns",
  folders: "uxarchive_folders",
  captures: "uxarchive_captures",
  insights: "uxarchive_insights",
  tags: "uxarchive_tags",
}

const STORAGE_KEY_LOOKUP = Object.entries(LOCAL_STORAGE_KEYS).reduce(
  (acc, [collection, storageKey]) => {
    acc[storageKey] = collection as StorageCollectionKey
    return acc
  },
  {} as Record<string, StorageCollectionKey>,
)

const emptyCollections: StorageCollections = {
  patterns: [],
  folders: [],
  captures: [],
  insights: [],
  tags: [],
}

const inMemoryCache: StorageCollections = { ...emptyCollections }

const subscribers: {
  [K in StorageCollectionKey]: Set<(value: StorageCollections[K]) => void>
} = {
  patterns: new Set(),
  folders: new Set(),
  captures: new Set(),
  insights: new Set(),
  tags: new Set(),
}

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined"

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return clone(fallback)
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn("[storage] JSON parse 실패", error)
    return clone(fallback)
  }
}

const readCollection = <K extends StorageCollectionKey>(key: K): StorageCollections[K] => {
  if (!isBrowser()) {
    return clone(inMemoryCache[key])
  }
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEYS[key])
  const parsed = safeParse<StorageCollections[K]>(raw, emptyCollections[key])
  return Array.isArray(parsed) ? parsed : clone(emptyCollections[key])
}

const writeCollection = <K extends StorageCollectionKey>(key: K, value: StorageCollections[K]) => {
  const snapshot = clone(value)
  if (!isBrowser()) {
    inMemoryCache[key] = snapshot
    notifySubscribers(key, snapshot)
    return
  }
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEYS[key], JSON.stringify(snapshot))
    notifySubscribers(key, snapshot)
  } catch (error) {
    console.error(`[storage] localStorage setItem 실패 (${LOCAL_STORAGE_KEYS[key]})`, error)
  }
}

const notifySubscribers = <K extends StorageCollectionKey>(key: K, payload: StorageCollections[K]) => {
  subscribers[key].forEach((listener) => listener(clone(payload)))
}

type CollectionItem<K extends StorageCollectionKey> = StorageCollections[K] extends (infer Item)[]
  ? Item extends IdentifiableEntity
    ? Item
    : never
  : never

export interface CollectionRepository<K extends StorageCollectionKey> {
  key: K
  getAll: () => CollectionItem<K>[]
  getById: (id: string) => CollectionItem<K> | undefined
  setAll: (items: CollectionItem<K>[]) => void
  create: (item: CollectionItem<K>) => CollectionItem<K>
  upsert: (item: CollectionItem<K>) => CollectionItem<K>
  update: (id: string, updater: (current: CollectionItem<K>) => CollectionItem<K>) => CollectionItem<K> | undefined
  remove: (id: string) => void
  clear: () => void
  subscribe: (listener: (items: CollectionItem<K>[]) => void) => () => void
}

const createCollectionRepository = <K extends StorageCollectionKey>(key: K): CollectionRepository<K> => {
  const getAll = () => readCollection(key)

  const setAll = (items: CollectionItem<K>[]) => writeCollection(key, items)

  const getById = (id: string) => getAll().find((item) => item.id === id)

  const create = (item: CollectionItem<K>) => {
    const next = [...getAll(), item]
    setAll(next)
    return item
  }

  const upsert = (item: CollectionItem<K>) => {
    const items = getAll()
    const index = items.findIndex((entity) => entity.id === item.id)
    if (index >= 0) {
      const next = [...items]
      next[index] = item
      setAll(next)
      return item
    }
    return create(item)
  }

  const update = (id: string, updater: (current: CollectionItem<K>) => CollectionItem<K>) => {
    const items = getAll()
    const index = items.findIndex((entity) => entity.id === id)
    if (index === -1) return undefined
    const updated = updater(items[index])
    const next = [...items]
    next[index] = updated
    setAll(next)
    return updated
  }

  const remove = (id: string) => {
    const filtered = getAll().filter((item) => item.id !== id)
    setAll(filtered)
  }

  const clear = () => setAll([] as CollectionItem<K>[])

  const subscribe = (listener: (items: CollectionItem<K>[]) => void) => {
    const wrapped = (value: StorageCollections[K]) => listener(value as CollectionItem<K>[])
    subscribers[key].add(wrapped)
    return () => subscribers[key].delete(wrapped)
  }

  return { key, getAll, getById, setAll, create, upsert, update, remove, clear, subscribe }
}

export const storageService = {
  patterns: createCollectionRepository("patterns"),
  folders: createCollectionRepository("folders"),
  captures: createCollectionRepository("captures"),
  insights: createCollectionRepository("insights"),
  tags: createCollectionRepository("tags"),
}

export const getStorageSnapshot = (): StorageCollections => ({
  patterns: storageService.patterns.getAll(),
  folders: storageService.folders.getAll(),
  captures: storageService.captures.getAll(),
  insights: storageService.insights.getAll(),
  tags: storageService.tags.getAll(),
})

export const subscribeToStorage = <K extends StorageCollectionKey>(
  key: K,
  listener: (value: StorageCollections[K]) => void,
) => {
  subscribers[key].add(listener)
  return () => subscribers[key].delete(listener)
}

if (isBrowser()) {
  window.addEventListener("storage", (event) => {
    if (!event.key) return
    const collectionKey = STORAGE_KEY_LOOKUP[event.key]
    if (!collectionKey) return
    const nextValue = readCollection(collectionKey)
    notifySubscribers(collectionKey, nextValue)
  })
}

export type PatternRepository = CollectionRepository<"patterns">
export type FolderRepository = CollectionRepository<"folders">
export type CaptureRepository = CollectionRepository<"captures">
export type InsightRepository = CollectionRepository<"insights">
export type TagRepository = CollectionRepository<"tags">

export type RepositoryMap = typeof storageService
