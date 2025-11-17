"use client"

import { LogOut, UserRound } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useSupabaseSession } from "@/lib/supabase/session-context"

const getInitials = (email?: string | null, fallback?: string) => {
  if (email) {
    const [name] = email.split("@")
    if (name) {
      const segments = name
        .split(/[._-]/)
        .filter(Boolean)
        .map((segment) => segment[0])
      if (segments.length) {
        return segments.join("").slice(0, 2).toUpperCase()
      }
    }
  }
  if (fallback) {
    return fallback
      .split(" ")
      .filter(Boolean)
      .map((segment) => segment[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }
  return "UX"
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, signOut, loading } = useSupabaseSession()

  const metadata = (user?.user_metadata ?? {}) as {
    avatar_url?: string
    full_name?: string
    name?: string
  }

  const avatarUrl = metadata.avatar_url ?? undefined
  const email = user?.email ?? (loading ? "Loading account info" : "Sign-in required")
  const displayName = metadata.full_name ?? metadata.name ?? email
  const initials = getInitials(user?.email, displayName)

  const handleSignOut = async () => {
    if (!user) return
    await signOut()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="flex items-center justify-center data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
            >
              <Avatar className="h-8 w-8 rounded-full">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="rounded-full bg-gray-500">
                  {avatarUrl ? initials : <UserRound className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="rounded-lg">
                    {avatarUrl ? initials : <UserRound className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            {user ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2"
                  onSelect={(event) => {
                    event.preventDefault()
                    void handleSignOut()
                  }}
                >
                  <LogOut className="h-4 w-4" /> Log out
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
