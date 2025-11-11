"use client"

import { Search } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface SidebarShellProps {
  searchValue: string
  onSearchChange: (value: string) => void
  folderCount: number
  visiblePatternCount: number
  children: ReactNode
  className?: string
}

export const SidebarShell = ({
  searchValue,
  onSearchChange,
  folderCount,
  visiblePatternCount,
  children,
  className,
}: SidebarShellProps) => {
  const summaryText =
    visiblePatternCount > 0
      ? `노출 중인 패턴 ${visiblePatternCount}개`
      : "저장된 패턴이 없습니다. mock 데이터를 초기화하세요."

  return (
    <aside className={cn("panel-column", className)} data-panel="left">
      <div className="panel-scroll flex flex-col gap-6 overflow-y-hidden p-4">
        <section className="flex justify-between space-y-2">
          <div>
            <h1 className="text-2xl font-semibold">UX Archive</h1>
            <p className="text-xs text-muted-foreground">폴더 {folderCount}개 · {summaryText}</p>
          </div>
          <Button
            variant="outline"
            className="border-dashed border-border/70 font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            + 새 패턴
          </Button>
        </section>

        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="패턴, 서비스, 태그 검색"
              className="pl-10"
            />
          </div>
        </section>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 pb-6">{children}</div>
        </ScrollArea>
      </div>
    </aside>
  )
}
