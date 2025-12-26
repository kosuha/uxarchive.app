import { Skeleton } from "@/components/ui/skeleton"

export function AssetGridSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-8 pb-8">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] rounded-xl overflow-hidden border bg-background shadow-sm">
                    <Skeleton className="w-full h-full" />
                </div>
            ))}
        </div>
    )
}
