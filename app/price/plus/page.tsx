"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useSupabaseSession } from "@/lib/supabase/session-context"

const features = [
  "Personal workspace included",
  "Up to 30 patterns",
  "Image download",
  "Sharable links",
]

export default function PlusPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-6 py-16">
        <header className="space-y-3 text-center">
          <Badge variant="outline" className="mx-auto h-8 rounded-full px-4">
            Plus · $3/mo
          </Badge>
          <h1 className="text-4xl font-black md:text-5xl">Upgrade to Plus</h1>
          <p className="text-lg text-muted-foreground">
            개인 워크스페이스를 넉넉하게 확장하고 모든 패턴을 안전하게 보관하세요.
          </p>
        </header>

        <div className="rounded-3xl border border-border/70 bg-card/90 backdrop-blur">
          <div className="flex flex-col gap-8 p-8">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black">$3</span>
                  <span className="text-base text-muted-foreground">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  언제든 취소할 수 있습니다. 결제 후 바로 플랜이 적용됩니다.
                </p>
              </div>

            <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">포함 기능</h2>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {features.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-6">
                <CheckoutBlock />
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}

function CheckoutBlock() {
  const { session } = useSupabaseSession()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCheckout = useCallback(async () => {
    if (!session) {
      toast({
        title: "로그인 후 진행해주세요",
        description: "워크스페이스에서 로그인/회원가입을 완료하면 결제가 이어집니다.",
      })
      router.push("/workspace")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/lemonsqueezy/checkout", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Checkout request failed: ${response.status}`)
      }

      const data = (await response.json()) as { url?: string }
      if (!data?.url) {
        throw new Error("Checkout URL is missing in the response.")
      }

      window.location.href = data.url
    } catch (error) {
      console.error(error)
      toast({
        title: "체크아웃을 준비할 수 없어요",
        description: "잠시 후 다시 시도해주세요. 문제가 지속되면 알려주세요.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [router, session, toast])

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">결제</p>
        <p className="text-xs text-muted-foreground">결제 완료 즉시 플랜이 활성화됩니다.</p>
      </div>
      <Button className="w-full" size="lg" onClick={handleCheckout} disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            준비 중...
          </span>
        ) : (
          "플러스 구독 시작하기"
        )}
      </Button>
      <Separator />
      <p className="text-xs text-muted-foreground">
        로그인된 계정으로 구독이 연결됩니다. 결제 후 워크스페이스에서 바로 확인하세요.
      </p>
    </div>
  )
}
