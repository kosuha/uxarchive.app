"use client"

import { Clock, Sparkles } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { EmptyPlaceholder } from "@/components/app-sidebar/nav-views/empty-placeholder"

const mockUpdates = [
  {
    id: "mock-1",
    title: "신규 캡처 4건",
    description: "모바일 온보딩 플로우",
    timestamp: "오늘 오전 10:21",
  },
  {
    id: "mock-2",
    title: "태그 정리",
    description: "결제, 확인, 인증",
    timestamp: "어제 오후 4:02",
  },
  {
    id: "mock-3",
    title: "폴더 이동",
    description: "My Workspace → Payments",
    timestamp: "어제 오전 9:47",
  },
]

export function RecentUpdatesView() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="rounded-md border border-border/60 bg-background p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="size-4" />최근 활동 요약
        </div>
        <p className="mt-1 text-xs text-muted-foreground">곧 실제 업데이트 이벤트와 연결될 예정입니다.</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-md border border-border/60 bg-background">
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/60">
            {mockUpdates.map((update) => (
              <div key={update.id} className="p-4">
                <p className="text-sm font-semibold text-foreground">{update.title}</p>
                <p className="text-sm text-muted-foreground">{update.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{update.timestamp}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <EmptyPlaceholder
          icon={Sparkles}
          title="실제 활동 로그가 이 영역에 표시됩니다"
          description="이제 API 혹은 로컬 스토리지 이벤트를 연결하면 됩니다."
          className="border-0"
        />
      </div>
    </div>
  )
}
