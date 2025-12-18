"use client"

import { RepositoryRecord } from "@/lib/repositories/repositories"
import { Eye, GitFork, Heart } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { toggleRepositoryLikeAction } from "@/app/actions/interactions"
import { useSupabaseSession } from "@/lib/supabase/session-context"
import { useRouter } from "next/navigation"

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

export function RepositoryCard({ repo }: { repo: RepositoryRecord }) {
    const router = useRouter()
    const { user } = useSupabaseSession()
    const fallbackInitial = getInitial(repo.name)
    const fallbackGradient = pickGradient(repo.id || repo.name)

    // Stats State
    const [likeCount, setLikeCount] = useState(repo.likeCount || 0)
    // Assuming we don't know if the user liked it initially without extra data, default false.
    // In a real app we'd pass `isLiked` from server.
    const [isLiked, setIsLiked] = useState(false)

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        if (!user) {
            router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
            return
        }

        // Optimistic update
        setLikeCount(prev => prev + (isLiked ? -1 : 1))
        setIsLiked(prev => !prev)

        try {
            await toggleRepositoryLikeAction(repo.id)
        } catch (error) {
            // Revert on error
            setLikeCount(prev => prev + (isLiked ? 1 : -1))
            setIsLiked(prev => !prev)
            console.error("Failed to toggle like", error)
        }
    }

    return (
        <div className="group break-inside-avoid flex flex-col gap-4 focus-visible:outline-none min-w-[200px] select-none">
            {/* Card Image / Cover */}
            <Link href={`/share/r/${repo.id}`} className="block focus-visible:outline-none" draggable={false}>
                <div className="relative w-full overflow-hidden rounded-[24px] bg-border transition-all duration-300 group-hover:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-ring aspect-[3/4]">
                    <div className="relative flex w-full h-full justify-center items-center overflow-hidden rounded-2xl">
                        {repo.thumbnailUrl ? (
                            <Image
                                src={repo.thumbnailUrl}
                                alt={repo.name}
                                fill
                                draggable={false}
                                className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                            />
                        ) : (
                            <div
                                role="img"
                                aria-label={`Cover for ${repo.name}`}
                                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${fallbackGradient} text-5xl font-semibold text-slate-700/50`}
                            >
                                {fallbackInitial}
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            {/* Card Content & Stats */}
            <div className="flex flex-col gap-2">
                <Link href={`/share/r/${repo.id}`} className="flex flex-col min-w-0 pt-0.5 focus-visible:outline-none" draggable={false}>
                    <h3 className="text-[15px] font-bold leading-tight text-foreground truncate group-hover:text-foreground/90 transition-colors">
                        {repo.name}
                    </h3>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 leading-snug mt-1">
                        {repo.description || "No description provided."}
                    </p>
                </Link>

                {/* Stats Footer */}
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5" title="Views">
                        <Eye className="size-3.5" />
                        <span>{repo.viewCount || 0}</span>
                    </div>
                    <button
                        onClick={handleLike}
                        className="flex items-center gap-1.5 hover:text-red-400 transition-colors focus:outline-none group/like"
                        title="Likes"
                    >
                        <Heart className={`size-3.5 transition-colors ${isLiked ? "fill-red-500 text-red-500" : "group-hover/like:text-red-400"}`} />
                        <span>{likeCount}</span>
                    </button>
                    <div className="flex items-center gap-1.5" title="Forks">
                        <GitFork className="size-3.5" />
                        <span>{repo.forkCount || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
