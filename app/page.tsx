"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
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
import { mockPatterns } from "@/lib/mock-data"

export default function Page() {
  const defaultPatternId = mockPatterns[0]?.id
  const [selectedPatternId, setSelectedPatternId] = React.useState<string | undefined>(
    defaultPatternId
  )

  return (
    <SidebarProvider>
      <AppSidebar
        selectedPatternId={selectedPatternId}
        onPatternSelect={setSelectedPatternId}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">UX Archive</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>패턴 라이브러리</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
          <RightWorkspace patternId={selectedPatternId} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
