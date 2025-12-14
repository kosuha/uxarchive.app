"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ShareCard, type ShareListingPost } from "@/components/share/share-card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface FeaturedSectionProps {
    title: string
    subtitle?: string
    items: ShareListingPost[]
    href?: string
}

export function FeaturedSection({ title, subtitle, items, href }: FeaturedSectionProps) {
    if (!items || items.length === 0) return null

    return (
        <section className="space-y-4 py-6">
            <div className="flex items-center justify-between px-1">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
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

            <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex w-max space-x-6 pb-4 p-1">
                    {items.map((item) => (
                        <div key={item.id} className="w-[300px]">
                            <ShareCard item={item} />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </section>
    )
}
