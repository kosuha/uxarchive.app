"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ProPage() {
  const router = useRouter()

  return (
    <AuthGuard>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-6 py-16">
        <header className="space-y-3 text-center">
          <Badge variant="secondary" className="mx-auto h-8 rounded-full px-4">
            Pro · coming soon
          </Badge>
          <h1 className="text-4xl font-black md:text-5xl">Pro Plan 준비 중</h1>
          <p className="text-lg text-muted-foreground">
            팀 워크스페이스, 무제한 패턴, 프로토타이핑을 포함한 Pro는 준비 중입니다.
          </p>
        </header>

        <div className="rounded-3xl border border-border/70 bg-card/90 p-8 text-center backdrop-blur">
          <p className="text-sm text-muted-foreground">
            곧 Pro 플랜 결제도 이 페이지에서 제공됩니다. 지금은 Plus로 먼저 시작해 보세요.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => router.push("/price/plus")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Plus 플랜으로 이동
            </Button>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
