"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function ShareError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Failed to render shared posts", error)
  }, [error])

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
          <div className="space-y-2">
            <p className="text-lg font-semibold">We couldn&apos;t load published posts</p>
            <p className="text-sm text-destructive/80">
              Please try again in a moment. If the problem continues, refresh the page.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => reset()}>
              Try again
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
