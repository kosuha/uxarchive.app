export type TagType = "service-category" | "pattern-type" | "custom"

export interface IdentifiableEntity {
  id: string
}

export interface Tag extends IdentifiableEntity {
  label: string
  type: TagType
  color?: string
  createdAt: string
}

export interface Folder extends IdentifiableEntity {
  workspaceId: string
  name: string
  parentId?: string | null
  createdAt: string
}

export interface Pattern extends IdentifiableEntity {
  folderId: string | null
  name: string
  serviceName: string
  summary: string
  tags: Tag[]
  author: string
  isFavorite: boolean
  isPublic: boolean
  publicUrl?: string | null
  thumbnailUrl?: string | null
  views?: number
  viewCount: number
  likeCount: number
  forkCount: number
  originalPatternId?: string | null
  isLiked?: boolean
  createdAt: string
  updatedAt: string
  captureCount: number
}

export interface Capture extends IdentifiableEntity {
  patternId: string
  imageUrl: string
  downloadUrl?: string
  order: number
  createdAt: string
}

export interface Insight extends IdentifiableEntity {
  captureId: string
  x: number
  y: number
  note: string
  createdAt: string
  clientId?: string
}

export interface StorageCollections {
  patterns: Pattern[]
  folders: Folder[]
  captures: Capture[]
  insights: Insight[]
  tags: Tag[]
}

export type StorageCollectionKey = keyof StorageCollections
