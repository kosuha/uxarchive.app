"use client"

import * as React from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { RepositoryDataProvider } from "@/components/repository-data-context"
import { RepositoryAppSidebar } from "@/components/repository-app-sidebar"
import { RepositoryWorkspace } from "@/components/repository-workspace"
import { cn } from "@/lib/utils"
import { WorkspaceDataProvider } from "@/lib/workspace-data-context"

export default function WorkspacePage() {
  return (
    <AuthGuard>
      <WorkspaceDataProvider>
        <RepositoryDataProvider>
          <SidebarProvider className="h-svh overflow-hidden">
            <RepositoryAppSidebar />
            <SidebarInset>
              <RepositoryWorkspace />
            </SidebarInset>
          </SidebarProvider>
        </RepositoryDataProvider>
      </WorkspaceDataProvider>
    </AuthGuard>
  )
}
