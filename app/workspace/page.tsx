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
import { WorkspaceDataProvider, useWorkspaceData } from "@/lib/workspace-data-context"
import type { Folder, Pattern } from "@/lib/types"
import { FolderIcon, LibraryBig } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export default function Page() {
  return (
    <AuthGuard>
      <WorkspaceDataProvider>
        <WorkspaceShell />
      </WorkspaceDataProvider>
    </AuthGuard>
  )
}

function WorkspaceShell() {
  const { patterns, folders, loading, error } = useWorkspaceData()
  const [selectedPatternId, setSelectedPatternId] = React.useState<string | undefined>(undefined)
  const isMobile = useIsMobile()

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

  const patternLimitMessage: string | null = null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-destructive">
        {error}
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        selectedPatternId={selectedPatternId}
        onPatternSelect={setSelectedPatternId}
        patternLimitMessage={patternLimitMessage}
        className="p-0 pr-2"
      />
      <SidebarInset>
        <header
          className={cn(
            "flex shrink-0 items-center gap-2",
            isMobile ? "flex-col items-start border-b border-border/60 px-3 py-3" : "h-12 justify-between px-4"
          )}
        >
          <div className="flex w-full items-center gap-2">
            <SidebarTrigger className={cn("-ml-1", isMobile && "mr-1")} />
            {!isMobile && (
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
            )}
            {!isMobile ? (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="flex items-center gap-1">
                    <LibraryBig className="h-4 w-4" />
                    <span>My Archive</span>
                  </BreadcrumbItem>
                  {folderPath.map((folder) => (
                    <React.Fragment key={folder.id}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem className="flex items-center gap-1">
                        <FolderIcon className="h-4 w-4" />
                        <span>{folder.name}</span>
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {selectedPattern?.name ?? "No pattern selected"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            ) : (
              <div className="flex flex-1 items-center gap-2 text-sm font-semibold">
                <LibraryBig className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-foreground">
                  {selectedPattern?.name ?? "패턴 미선택"}
                </span>
              </div>
            )}
          </div>
          {isMobile ? (
            folderPath.length ? (
              <div className="flex w-full flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">경로</span>
                {folderPath.map((folder) => (
                  <span
                    key={folder.id}
                    className="rounded-full bg-muted px-2 py-1"
                  >
                    {folder.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">My Archive</div>
            )
          ) : null}
        </header>
        <div
          className={cn(
            "flex flex-1 basis-0 min-h-0 flex-col gap-4 overflow-hidden",
            isMobile ? "p-3 pt-0 overflow-auto" : "p-4 pt-0"
          )}
        >
          <RightWorkspace patternId={selectedPatternId} />
        </div>
      </SidebarInset>
    </SidebarProvider>
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
