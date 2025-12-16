"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandInput,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RepositoryResultCard } from "@/components/app-sidebar/nav-views/repository-result-card"
import { FolderResultCard } from "@/components/app-sidebar/nav-views/folder-result-card"
import { AssetResultCard } from "@/components/app-sidebar/nav-views/asset-result-card"
import { useRepositoryData } from "@/components/repository-data-context"
import { cn } from "@/lib/utils"

export type SearchViewProps = {
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
}

export function SearchView({
  query,
  setQuery,
}: SearchViewProps) {
  const { repositories, folders, assets, loading, setSelectedRepositoryId, setCurrentFolderId } = useRepositoryData()
  const [isInputFocused, setIsInputFocused] = React.useState(false)
  const blurTimeoutRef = React.useRef<number | null>(null)

  const trimmedQuery = query.trim()
  const hasKeyword = trimmedQuery.length > 0
  const normalizedQuery = trimmedQuery.toLowerCase()

  const handleInputFocus = React.useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsInputFocused(true)
  }, [])

  const handleInputBlur = React.useCallback(() => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsInputFocused(false)
      blurTimeoutRef.current = null
    }, 120)
  }, [])

  React.useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
    }
  }, [])

  const filteredRepositories = React.useMemo(() => {
    if (!hasKeyword) return []

    return repositories.filter((repo) => {
      return (
        repo.name.toLowerCase().includes(normalizedQuery) ||
        (repo.description && repo.description.toLowerCase().includes(normalizedQuery))
      )
    })
  }, [hasKeyword, normalizedQuery, repositories])

  const filteredFolders = React.useMemo(() => {
    if (!hasKeyword) return []

    return folders.filter((folder) => {
      const desc = folder.description
      
      return (
        folder.name.toLowerCase().includes(normalizedQuery) ||
        (desc && desc.toLowerCase().includes(normalizedQuery))
      )
    })
  }, [hasKeyword, normalizedQuery, folders])

  const filteredAssets = React.useMemo(() => {
    if (!hasKeyword) return []

    return assets.filter((asset) => {
      const name = asset.name || ""
      return name.toLowerCase().includes(normalizedQuery)
    })
  }, [hasKeyword, normalizedQuery, assets])

  const handleRepositorySelect = React.useCallback(
    (repositoryId: string) => {
      setSelectedRepositoryId(repositoryId)
      // Clear folder selection to show root of repo
      setCurrentFolderId(null)
    },
    [setSelectedRepositoryId, setCurrentFolderId]
  )

  const handleFolderSelect = React.useCallback(
    (folderId: string) => {
        // setCurrentFolderId handles repo switching internally if needed
        setCurrentFolderId(folderId)
    },
    [setCurrentFolderId]
  )

  const handleAssetSelect = React.useCallback(
      (assetId: string) => {
        // Find asset's folder to navigate to it
        const asset = assets.find(a => a.id === assetId)
        if (asset) {
            if (asset.folderId) {
                setCurrentFolderId(asset.folderId)
            } else {
                 // Asset in root of repository
                 // We need to switch to that repository
                 setSelectedRepositoryId(asset.repositoryId)
                 setCurrentFolderId(null)
            }
            // Ideally we would also "select" the asset in view, but current context might not support focusing an asset specifically other than opening it.
            // For now, navigating to its folder is good.
        }
      },
      [assets, setCurrentFolderId, setSelectedRepositoryId]
  )

  const renderResults = () => {
    if (loading) {
      return (
        <div className="text-xs text-muted-foreground">Loading...</div>
      )
    }

    if (!hasKeyword) {
      return (
        <p className="text-xs text-muted-foreground">Enter a query to search.</p>
      )
    }

    const hasResults = filteredRepositories.length > 0 || filteredFolders.length > 0 || filteredAssets.length > 0

    if (!hasResults) {
      return <p className="text-xs text-muted-foreground">No matching results found.</p>
    }

    return (
      <ScrollArea className="h-full">
        <div className="space-y-6 pb-4">
            {filteredRepositories.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground px-1">Repositories</h3>
                    <div className="space-y-2">
                        {filteredRepositories.map((repo) => (
                            <RepositoryResultCard
                                key={repo.id}
                                repository={repo}
                                onSelect={handleRepositorySelect}
                            />
                        ))}
                    </div>
                </div>
            )}

            {filteredFolders.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground px-1">Folders</h3>
                    <div className="space-y-2">
                        {filteredFolders.map((folder) => (
                            <FolderResultCard
                                key={folder.id}
                                folder={folder}
                                onSelect={handleFolderSelect}
                            />
                        ))}
                    </div>
                </div>
            )}

            {filteredAssets.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground px-1">Assets</h3>
                    <div className="space-y-2">
                        {filteredAssets.map((asset) => (
                            <AssetResultCard
                                key={asset.id}
                                asset={asset}
                                onSelect={handleAssetSelect}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
      </ScrollArea>
    )
  }

  const totalResults = filteredRepositories.length + filteredFolders.length + filteredAssets.length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="">
        <div className="flex flex-wrap justify-between text-muted-foreground text-xs font-medium gap-2 mb-2 items-center">
          <span>
            Search
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setQuery("")}
            disabled={!hasKeyword}
            className="text-xs text-muted-foreground p-0 m-0 h-auto"
          >
            Clear
          </Button>
        </div>
        <div className="">
          <Command className="relative border border-border/60 overflow-visible">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Search repositories, folders, assets..."
            />
          </Command>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
          <span className="text-xs text-muted-foreground">
            {totalResults ? (`${totalResults} results`) : ("")}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderResults()}
        </div>
      </div>
    </div>
  )
}
