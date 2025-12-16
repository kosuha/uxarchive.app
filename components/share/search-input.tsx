"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string
}

export function SearchInput({ className, ...props }: SearchInputProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [value, setValue] = React.useState(searchParams.get("search") || "")

    // Sync internal state with URL if it changes externally
    React.useEffect(() => {
        setValue(searchParams.get("search") || "")
    }, [searchParams])

    const handleSearch = React.useCallback(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value.trim()) {
            params.set("search", value.trim())
        } else {
            params.delete("search")
        }

        const queryString = params.toString()
        
        // Determine target base path
        // If current path is /share/r (repositories), stay there. 
        // Otherwise default to /patterns (patterns/posts).
        const isRepositoriesPage = pathname === '/share/r'
        const basePath = isRepositoriesPage ? '/share/r' : '/patterns'
        
        const targetUrl = queryString ? `${basePath}?${queryString}` : basePath

        if (pathname === basePath) {
            router.replace(`?${queryString}`, { scroll: false })
        } else {
            router.push(targetUrl)
        }
    }, [router, searchParams, value, pathname])

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    return (
        <div className={cn("relative w-full max-w-md", className)}>
            <Input
                {...props}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search"
                className="h-10 w-full rounded-full border-border bg-muted/50 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:bg-accent focus-visible:ring-0"
            />
            <button
                onClick={handleSearch}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
            >
                <Search className="h-4 w-4" />
            </button>
        </div>
    )
}
