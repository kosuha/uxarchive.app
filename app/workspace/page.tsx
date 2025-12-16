"use client"

import * as React from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { RepositoryDataProvider } from "@/components/repository-data-context"
import { RepositorySidebar } from "@/components/repository-sidebar"
import { RepositoryWorkspace } from "@/components/repository-workspace"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export default function Page() {
  return (
    <AuthGuard>
      <RepositoryDataProvider>
        <SidebarProvider>
          <RepositorySidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                {/* Breadcrumbs can go here or inside workspace */}
              </header>
              <RepositoryWorkspace className="flex-1" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </RepositoryDataProvider>
    </AuthGuard>
  )
}
