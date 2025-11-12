"use client"

import { Star } from "lucide-react"

import { EmptyPlaceholder } from "@/components/app-sidebar/nav-views/empty-placeholder"

export function FavoritesView() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="rounded-md border border-border/60 bg-background p-3 text-sm text-muted-foreground">
        즐겨찾기는 자주 참고하는 패턴을 빠르게 열람하기 위한 뷰입니다.
      </div>
      <EmptyPlaceholder
        icon={Star}
        title="즐겨찾기할 항목을 선택하세요"
        description="패턴 카드나 트리에서 별 아이콘을 눌러 즐겨찾기로 등록할 수 있도록 연결할 예정입니다."
        actionLabel="즐겨찾기 설정 가이드 열기"
        onActionClick={() => {
          /* 실제 연결 예정 */
        }}
      />
      <div className="rounded-md border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        <p>TODO</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>즐겨찾기 데이터 소스 연결</li>
          <li>정렬/필터 옵션 추가</li>
          <li>카드/리스트 레이아웃 전환</li>
        </ul>
      </div>
    </div>
  )
}
