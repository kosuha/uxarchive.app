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
          <h1 className="text-4xl font-black md:text-5xl">Pro Plan coming soon</h1>
          <p className="text-lg text-muted-foreground">
            Pro is on the way with team workspaces, unlimited patterns, and prototyping.
          </p>
        </header>

        <div className="rounded-3xl border border-border/70 bg-card/90 p-8 text-center backdrop-blur">
          <p className="text-sm text-muted-foreground">
            We&apos;ll offer Pro billing here soon. Start with Plus for now.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => router.push("/price/plus")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Plus plan
            </Button>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
