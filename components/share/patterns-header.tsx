"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Grid, LayoutDashboard, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/share/search-input"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"

interface PatternsHeaderProps {
    hideSearch?: boolean
}

export function PatternsHeader({ hideSearch = false }: PatternsHeaderProps) {
    const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false)

    // Force close mobile search if search is hidden
    React.useEffect(() => {
        if (hideSearch) setIsMobileSearchOpen(false)
    }, [hideSearch])

    const pathname = usePathname()
    const isPatternsPage = pathname === "/patterns"

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0C0C0C]/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Left: Logo (Hidden when mobile search is open) */}
                <div className={cn(
                    "flex items-center justify-start gap-4 w-auto md:w-32 transition-opacity duration-200",
                    isMobileSearchOpen ? "opacity-0 pointer-events-none absolute" : "opacity-100"
                )}>
                    <Link href="/" className="flex items-center gap-2 group">
                        <Image
                            src="/logo.svg"
                            alt="UX Archive"
                            width={50}
                            height={50}
                            className="h-12 w-12"
                        />
                    </Link>
                </div>

                {/* Center: Search */}
                {!hideSearch && (
                    <div className={cn(
                        "flex-1 items-center justify-center px-4 md:px-8 transition-all duration-200",
                        isMobileSearchOpen ? "flex" : "hidden md:flex"
                    )}>
                        <SearchInput className="w-full max-w-md" autoFocus={isMobileSearchOpen} />
                    </div>
                )}

                {/* Right: Actions */}
                <div className="flex w-auto md:w-auto items-center justify-end gap-2 sm:gap-4">
                    {/* Mobile Search Toggle */}
                    {!hideSearch && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/60 hover:text-white md:hidden"
                            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                        >
                            {isMobileSearchOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Search className="h-5 w-5" />
                            )}
                        </Button>
                    )}

                    {/* Desktop Navigation */}
                    <div className={cn(
                        "flex items-center gap-2 transition-opacity duration-200",
                        isMobileSearchOpen ? "hidden" : "flex"
                    )}>
                        {isPatternsPage ? (
                            <Button
                                variant="ghost"
                                asChild
                                className="px-4 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                            >
                                <Link href="/share/r" className="gap-2">
                                    <span>Repositories</span>
                                </Link>
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                asChild
                                className="px-4 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                            >
                                <Link href="/patterns" className="gap-2">
                                    <span>Patterns</span>
                                </Link>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            asChild
                            className="px-4 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                        >
                            <Link href="/workspace" className="gap-2">
                                {/* On mobile, usually show Icon only or just text? Reference layout used Text. */}
                                {/* But standard header usually has icons. Let's stick to the text-only button for mobile if space permits, or hide 'Explore' on mobile. */}
                                {/* The reference patterns-page.tsx showed 'Workspace' button. */}
                                {/* The User asked to REMOVE icons in Viewer. I should probably respect that preference here too if I want consistency. */}
                                {/* But patterns-page generally had icons? Let's check patterns-page content again. Step 133 had icons inside buttons? */}
                                {/* Step 133: Link href="/workspace" ... <Button>Workspace</Button> NO icon inside text button. */}
                                {/* So I should follow NO ICON policy? */}
                                {/* But the prompt "Remove icon" was for Viewer. */}
                                {/* I will include icons for Desktop 'Explore Patterns' because it looks better, but remove them if user insists. */}
                                {/* Actually, user said "Remove icon" specifically in Viewer context. */}
                                {/* I'll start with icons for 'Explore' (desktop) and 'Workspace' (desktop). */}
                                {/* Wait, patterns-page.tsx reference (Step 133) did NOT have icons in the button text. */}
                                {/* Step 133: <Button ...>Workspace</Button>. No <LayoutDashboard>. */}
                                {/* So I will remove icons here too to match perfectly. */}
                                <span>Workspace</span>
                            </Link>
                        </Button>
                        <NavUser />
                    </div>
                </div>
            </div>
        </nav>
    )
}
