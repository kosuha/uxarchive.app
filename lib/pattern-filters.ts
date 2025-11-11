import type { Pattern } from "./types"

export interface PatternFilterOptions {
  searchTerm?: string
  folderFilterId?: string | null
  favoriteOnly?: boolean
  tagFilters?: string[]
}

const normalize = (value: string) => value.normalize("NFC").toLowerCase()

const matchesSearch = (pattern: Pattern, query: string) => {
  if (!query.trim()) return true
  const target = normalize(query)
  return (
    normalize(pattern.name).includes(target) ||
    normalize(pattern.serviceName).includes(target) ||
    normalize(pattern.summary).includes(target) ||
    pattern.tags.some((tag) => normalize(tag.label).includes(target))
  )
}

const matchesFolder = (pattern: Pattern, folderId?: string | null) => {
  if (!folderId) return true
  return pattern.folderId === folderId
}

const matchesFavorite = (pattern: Pattern, favoriteOnly?: boolean) => {
  if (!favoriteOnly) return true
  return pattern.isFavorite
}

const matchesTags = (pattern: Pattern, tagFilters?: string[]) => {
  if (!tagFilters || tagFilters.length === 0) return true
  const tagIds = new Set(tagFilters)
  return Array.from(tagIds).every((tagId) => pattern.tags.some((tag) => tag.id === tagId))
}

export const patternMatchesFilters = (pattern: Pattern, filters: PatternFilterOptions) => {
  return (
    matchesFolder(pattern, filters.folderFilterId) &&
    matchesFavorite(pattern, filters.favoriteOnly) &&
    matchesTags(pattern, filters.tagFilters) &&
    matchesSearch(pattern, filters.searchTerm ?? "")
  )
}

export const getPatternFilterFlags = (filters: PatternFilterOptions) => {
  const hasSearch = Boolean(filters.searchTerm?.trim())
  const hasFolderFilter = Boolean(filters.folderFilterId)
  const hasFavoriteFilter = Boolean(filters.favoriteOnly)
  const hasTagFilter = Boolean(filters.tagFilters && filters.tagFilters.length > 0)
  return {
    hasSearch,
    hasFolderFilter,
    hasFavoriteFilter,
    hasTagFilter,
    isFiltering: hasSearch || hasFolderFilter || hasFavoriteFilter || hasTagFilter,
  }
}
