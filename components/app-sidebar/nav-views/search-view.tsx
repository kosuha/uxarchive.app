"use client"

import * as React from "react"
import { Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyPlaceholder } from "@/components/app-sidebar/nav-views/empty-placeholder"

export function SearchView() {
  const [query, setQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      if (!query.trim()) return
      setIsSearching(true)
      window.setTimeout(() => setIsSearching(false), 800)
    },
    [query]
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <div className="flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="패턴, 서비스, 혹은 태그로 검색"
            aria-label="패턴 검색"
          />
        </div>
      </form>
      <EmptyPlaceholder
        icon={Search}
        title="검색 기능을 준비 중이에요"
        description="검색 폼과 결과 리스트가 이 영역에 들어갈 예정입니다."
      />
    </div>
  )
}
