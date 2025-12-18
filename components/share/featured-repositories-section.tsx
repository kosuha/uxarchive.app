"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { RepositoryCard } from "@/components/share/repository-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RepositoryRecord } from "@/lib/repositories/repositories"
import { useDraggableScroll } from "@/hooks/use-draggable-scroll"
import { cn } from "@/lib/utils"

interface FeaturedRepositoriesSectionProps {
    title: string
    subtitle?: string
    items: RepositoryRecord[]
    href?: string
}

export function FeaturedRepositoriesSection({ title, subtitle, items, href }: FeaturedRepositoriesSectionProps) {
    const { ref, events, isDragging } = useDraggableScroll()

    if (!items || items.length === 0) return null

    return (
        <section className="space-y-4 py-6">
            <div className="flex items-center justify-between px-1">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {href && (
                    <Link
                        href={href}
                        className="group flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        View all
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                )}
            </div>

            <ScrollArea
                className="w-full whitespace-nowrap rounded-md"
                viewportRef={ref}
                viewportProps={{
                    ...events,
                    className: cn(
                        "cursor-grab active:cursor-grabbing",
                        isDragging && "cursor-grabbing"
                    ),
                }}
            >
                <div className="flex w-max space-x-6 pb-4 p-1">
                    {items.map((item) => (
                        <div key={item.id} className="w-[300px]">
                            <RepositoryCard repo={item} />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </section>
    )
}
