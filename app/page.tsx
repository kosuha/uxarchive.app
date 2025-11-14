"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { AuthGuard } from "@/components/auth/auth-guard"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { RightWorkspace } from "@/components/right-workspace"
import { useStorageCollections } from "@/lib/use-storage-collections"
import type { Folder, Pattern } from "@/lib/types"
import { FolderIcon, LibraryBig } from "lucide-react"

export default function Page() {
  const { patterns, folders } = useStorageCollections()
  const [selectedPatternId, setSelectedPatternId] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    setSelectedPatternId((current) => {
      if (!patterns.length) {
        return undefined
      }
      return patterns.some((pattern) => pattern.id === current)
        ? current
        : patterns[0].id
    })
  }, [patterns])

  const selectedPattern = React.useMemo<Pattern | undefined>(() => {
    if (!selectedPatternId) return undefined
    return patterns.find((pattern) => pattern.id === selectedPatternId)
  }, [patterns, selectedPatternId])

  const foldersById = React.useMemo(() => {
    return folders.reduce<Map<string, Folder>>((map, folder) => {
      map.set(folder.id, folder)
      return map
    }, new Map())
  }, [folders])

  const folderPath = React.useMemo(() => {
    return buildFolderPath(selectedPattern?.folderId, foldersById)
  }, [selectedPattern?.folderId, foldersById])

  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar
          selectedPatternId={selectedPatternId}
          onPatternSelect={setSelectedPatternId}
          className="p-0 pr-2"
        />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center justify-between gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="flex justify-center items-center">
                    <LibraryBig className="h-4 w-4" />
                    <span>내 아카이브</span>
                  </BreadcrumbItem>
                  {folderPath.map((folder) => (
                    <React.Fragment key={folder.id}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem className="flex justify-center items-center">
                        <FolderIcon className="h-4 w-4" />
                        <span>{folder.name}</span>
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {selectedPattern?.name ?? "선택된 패턴 없음"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 basis-0 min-h-0 flex-col gap-4 overflow-hidden p-4 pt-0">
            <RightWorkspace patternId={selectedPatternId} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}

const buildFolderPath = (
  folderId: string | null | undefined,
  folderMap: Map<string, Folder>
) => {
  if (!folderId) return []

  const path: Folder[] = []
  let currentId: string | null | undefined = folderId

  while (currentId) {
    const folder = folderMap.get(currentId)
    if (!folder) break
    path.unshift(folder)
    currentId = folder.parentId ?? null
  }

  return path
}
