"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function PublicThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const isDarkMode = isMounted && resolvedTheme === "dark"

  const handleToggle = () => {
    if (!isMounted) return
    setTheme(isDarkMode ? "light" : "dark")
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-pressed={isDarkMode}
        aria-label="다크 모드 전환"
        disabled={!isMounted}
        onClick={handleToggle}
        className="rounded-full border-input/80 bg-background/80 text-muted-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm"
      >
        <span className="sr-only">다크 모드 토글</span>
        {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>
    </div>
  )
}
