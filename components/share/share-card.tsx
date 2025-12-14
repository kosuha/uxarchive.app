"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, Heart, GitFork } from "lucide-react"
import { useState } from "react"
import type { ShareListItem } from "@/lib/api/share"
import { toggleLikeAction } from "@/app/actions/interactions"

export type ShareListingPost = ShareListItem

const FALLBACK_GRADIENTS = [
    "from-amber-100 via-orange-200 to-orange-300",
    "from-blue-100 via-indigo-200 to-indigo-300",
    "from-emerald-100 via-teal-200 to-teal-300",
    "from-rose-100 via-pink-200 to-pink-300",
    "from-slate-100 via-slate-200 to-slate-300",
    "from-violet-100 via-purple-200 to-purple-300",
]

const pickGradient = (seed: string) => {
    const normalized = seed || "gradient"
    const hash = normalized
        .split("")
        .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 997, 7)
    return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length]
}

const getInitial = (value: string) => (value?.trim()?.charAt(0) || "?").toUpperCase()

interface ShareCardProps {
    item: ShareListingPost
    priority?: boolean
}

export function ShareCard({ item, priority = false }: ShareCardProps) {
    const router = useRouter()
    const thumbnail = item.thumbnailUrl?.trim()
    const captures = (item.captureUrls || []).filter(Boolean)
    const fallbackInitial = getInitial(item.service || item.title)
    const fallbackGradient = pickGradient(item.id || item.title)
    const targetUrl = item.publicUrl || `/patterns/${item.id}`
    const isNew = item.updatedAt && new Date(item.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Stats State
    const [likeCount, setLikeCount] = useState(item.likeCount || 0)
    const [isLiked, setIsLiked] = useState(false) // TODO: Hydrate from API if possible

    const handleCardClick = () => router.push(targetUrl)
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleCardClick()
        }
    }

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        // Optimistic update
        setLikeCount(prev => prev + (isLiked ? -1 : 1))
        setIsLiked(prev => !prev)

        try {
            await toggleLikeAction(item.id)
        } catch (error) {
            // Revert on error
            setLikeCount(prev => prev + (isLiked ? 1 : -1))
            setIsLiked(prev => !prev)
            console.error("Failed to toggle like", error)
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className="group break-inside-avoid flex flex-col gap-4 focus-visible:outline-none hover:cursor-pointer min-w-[300px]"
        >
            {/* Card Image */}
            <div className="relative w-full overflow-hidden rounded-[24px] bg-[#1C1C1E] p-8 transition-all duration-300 group-hover:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-white/50 aspect-[4/3]">
                {/* New Badge */}
                {isNew && (
                    <div className="absolute left-4 top-4 z-10 rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                        New
                    </div>
                )}

                <div className="relative flex w-full h-full justify-center items-center overflow-hidden rounded-2xl">
                    {captures[0] || thumbnail ? (
                        <Image
                            src={captures[0] || thumbnail || ""}
                            alt={item.title}
                            fill
                            className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                            priority={priority}
                        />
                    ) : (
                        <div
                            role="img"
                            aria-label={`Placeholder cover for ${item.title}`}
                            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${fallbackGradient} text-3xl font-semibold text-slate-700`}
                        >
                            {fallbackInitial}
                        </div>
                    )}
                </div>
            </div>

            {/* Card Content & Stats */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-col min-w-0 pt-0.5">
                    <h3 className="text-[15px] font-bold leading-tight text-white truncate">
                        {item.service || item.title}
                    </h3>
                    <p className="text-[13px] text-white/50 truncate leading-tight mt-0.5">
                        {item.service ? item.title : "Mobile Design Patterns"}
                    </p>
                </div>

                {/* Stats Footer */}
                <div className="flex items-center gap-4 text-xs font-medium text-white/40 pt-1">
                    <div className="flex items-center gap-1.5" title="Views">
                        <Eye className="size-3.5" />
                        <span>{item.views || 0}</span>
                    </div>
                    <button
                        onClick={handleLike}
                        className="flex items-center gap-1.5 hover:text-red-400 transition-colors focus:outline-none"
                        title="Likes"
                    >
                        <Heart className={`size-3.5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                        <span>{likeCount}</span>
                    </button>
                    <div className="flex items-center gap-1.5" title="Forks">
                        <GitFork className="size-3.5" />
                        <span>{item.forkCount || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
