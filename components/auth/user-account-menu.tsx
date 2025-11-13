"use client"

import React from "react"
import { LogOut, UserRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSupabaseSession } from "@/lib/supabase/session-context"

const getInitials = (email?: string | null) => {
  if (!email) return "UX"
  const [name] = email.split("@")
  if (!name) return "UX"
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export const UserAccountMenu = () => {
  const { user, signOut } = useSupabaseSession()

  if (!user) return null

  const avatarUrl =
    (user.user_metadata as { avatar_url?: string } | null)?.avatar_url ??
    undefined
  const email = user.email ?? "로그인 사용자"

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full px-2 text-sm font-medium"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={email} />
            ) : null}
            <AvatarFallback className="flex items-center justify-center text-xs font-semibold">
              {avatarUrl ? getInitials(email) : <UserRound className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium">{email}</p>
            <p className="text-xs text-muted-foreground">Google 로그인</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault()
            handleSignOut()
          }}
        >
          <LogOut className="h-4 w-4" /> 로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
