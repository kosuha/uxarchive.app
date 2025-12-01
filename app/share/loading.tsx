import { ShareListingSkeleton } from "@/components/share/share-listing"
import { Skeleton } from "@/components/ui/skeleton"

export default function ShareLoadingPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <header className="space-y-3">
          <Skeleton className="h-4 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-72 sm:w-96" />
          </div>
        </header>
        <div className="mt-8">
          <ShareListingSkeleton />
        </div>
      </div>
    </div>
  )
}
