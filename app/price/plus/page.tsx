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
            Expand your personal workspace and keep every pattern safe.
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
                  Cancel anytime. The plan activates immediately after payment.
                </p>
              </div>

            <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">What&apos;s included</h2>
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
          title: "Please sign in first",
          description:
            "Complete sign-in or sign-up from the workspace to continue with payment.",
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
        title: "Unable to prepare checkout",
        description: "Please try again shortly. If the issue continues, let us know.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [router, session, toast])

    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Checkout</p>
          <p className="text-xs text-muted-foreground">
            Your plan activates as soon as the payment completes.
          </p>
        </div>
        <Button className="w-full" size="lg" onClick={handleCheckout} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing...
            </span>
          ) : (
            "Start Plus subscription"
          )}
        </Button>
        <Separator />
        <p className="text-xs text-muted-foreground">
          The subscription links to the account you are logged into. Check your workspace
          right after paying.
        </p>
      </div>
    )
  }
