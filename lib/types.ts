export type TagType = "service-category" | "pattern-type" | "custom"

export interface Tag {
  id: string
  label: string
  type: TagType
  color?: string
}

export interface Folder {
  id: string
  workspaceId: string
  name: string
  parentId?: string | null
  createdAt: string
}

export interface Pattern {
  id: string
  folderId: string
  name: string
  serviceName: string
  summary: string
  tags: Tag[]
  author: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  captureCount: number
}

export interface Capture {
  id: string
  patternId: string
  imageUrl: string
  order: number
  createdAt: string
}

export interface Insight {
  id: string
  captureId: string
  x: number
  y: number
  note: string
  createdAt: string
}

export interface IdentifiableEntity {
  id: string
}

export interface StorageCollections {
  patterns: Pattern[]
  folders: Folder[]
  captures: Capture[]
  insights: Insight[]
  tags: Tag[]
}

export type StorageCollectionKey = keyof StorageCollections

