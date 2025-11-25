"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LandingThemeToggleProps = {
  className?: string
}

export function LandingThemeToggle({ className }: LandingThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const isDarkMode = isMounted && resolvedTheme === "dark"

  const handleToggle = () => {
    if (!isMounted) return
    setTheme(isDarkMode ? "light" : "dark")
  }

  return (
    <div className={cn("fixed top-6 right-6 z-50", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-pressed={isDarkMode}
        aria-label="Toggle dark mode"
        disabled={!isMounted}
        onClick={handleToggle}
        className="rounded-full border-input/80 bg-background/80 text-muted-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:backdrop-blur-md transition-transform hover:-translate-y-0.5"
      >
        <span className="sr-only">Dark mode toggle</span>
        {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>
    </div>
  )
}
