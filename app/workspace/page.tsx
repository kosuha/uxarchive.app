"use client"

import * as React from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { RepositoryDataProvider } from "@/components/repository-data-context"
import { RepositoryAppSidebar } from "@/components/repository-app-sidebar"
import { RepositoryWorkspace } from "@/components/repository-workspace"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

export default function WorkspacePage() {
  return (
    <AuthGuard>
      <RepositoryDataProvider>
        <SidebarProvider>
          <RepositoryAppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        Workspace
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Repository</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <RepositoryWorkspace />
          </SidebarInset>
        </SidebarProvider>
      </RepositoryDataProvider>
    </AuthGuard>
  )
}
