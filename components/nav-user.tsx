"use client"

import * as React from "react"
import { ExternalLink, LogOut, Moon, Settings, Sun, UserRound, Zap } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfileAction, getProfileAction } from "@/app/actions/profiles"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
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

export function NavUser({ showUserInfo = false }: { showUserInfo?: boolean }) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { user, signOut, loading } = useSupabaseSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"account" | "subscription">("account")
  type PlanInfo = {
    planCode: string
    planStatus: string
    effectivePlan: string
    renewalAt?: string | null
    cancelAt?: string | null
    hasSubscription: boolean
    hasCustomer: boolean
  }
  const [planInfo, setPlanInfo] = React.useState<PlanInfo | null>(null)
  const [planLoading, setPlanLoading] = React.useState(false)
  const [planError, setPlanError] = React.useState<string | null>(null)
  const [portalLoading, setPortalLoading] = React.useState(false)
  const [portalError, setPortalError] = React.useState<string | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [profileUsername, setProfileUsername] = React.useState<string>("")
  const [isEditingUsername, setIsEditingUsername] = React.useState(false)
  const [pendingUsername, setPendingUsername] = React.useState("")
  const [usernameMessage, setUsernameMessage] = React.useState<{ text: string; type: "error" | "warning" } | null>(null)
  const [isSavingUsername, setIsSavingUsername] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const isDarkMode = isMounted && resolvedTheme === "dark"

  const metadata = (user?.user_metadata ?? {}) as {
    avatar_url?: string
    full_name?: string
    name?: string
    username?: string
  }

  const avatarUrl = metadata.avatar_url ?? undefined
  const email = user?.email ?? (loading ? "Loading account info" : "Sign-in required")
  const displayName = metadata.full_name ?? metadata.name ?? email
  const initials = getInitials(user?.email, displayName)

  // Fetch true profile data that might be newer than session metadata
  React.useEffect(() => {
    if (isProfileDialogOpen && user) {
      if (metadata.username) {
        setProfileUsername(metadata.username)
        setPendingUsername(metadata.username)
      }

      // Also fetch fresh data to ensure we have the latest
      getProfileAction().then((profile) => {
        if (profile?.username) {
          setProfileUsername(profile.username)
          if (!metadata.username) {
            setPendingUsername(profile.username)
          }
        }
      })
    }
  }, [isProfileDialogOpen, user, metadata.username])

  const handleSignOut = async () => {
    if (!user) return
    await signOut()
  }

  const handleSaveUsername = async () => {
    setUsernameMessage(null)
    if (pendingUsername === profileUsername) {
      setIsEditingUsername(false)
      return
    }

    setIsSavingUsername(true)
    try {
      const result = await updateProfileAction(pendingUsername)

      if (!result.success) {
        setUsernameMessage({
          text: result.message || "Failed to update username",
          type: (result.type as "error" | "warning") || "error"
        })
        return
      }

      setProfileUsername(result.username!)
      setIsEditingUsername(false)
      toast({
        title: "Profile updated",
        description: "Your username has been updated successfully.",
      })
      // Force a hard refresh to update session/sidebar if needed, 
      // or rely on next/navigation router.refresh() 
      router.refresh()
    } catch (error) {
      console.error("Failed to update username", error)
      setUsernameMessage({
        text: error instanceof Error ? error.message : "Failed to update username",
        type: "error"
      })
    } finally {
      setIsSavingUsername(false)
    }
  }

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
  }

  const handleOpenProfile = () => {
    setIsProfileDialogOpen(true)
    setIsMenuOpen(false)
    setActiveTab("account")
  }

  const fetchPlanInfo = React.useCallback(async () => {
    setPlanLoading(true)
    setPlanError(null)
    try {
      const response = await fetch("/api/profile/plan")
      if (!response.ok) {
        throw new Error(`Failed to load plan: ${response.status}`)
      }
      const data = (await response.json()) as PlanInfo
      setPlanInfo(data)
    } catch (error) {
      console.error("Plan fetch failed", error)
      setPlanError("We couldn't load your plan. Showing Free plan by default.")
      setPlanInfo({
        planCode: "free",
        planStatus: "active",
        effectivePlan: "free",
        renewalAt: null,
        cancelAt: null,
        hasSubscription: false,
        hasCustomer: false,
      })
    } finally {
      setPlanLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (isProfileDialogOpen && activeTab === "subscription" && !planInfo && !planLoading) {
      void fetchPlanInfo()
    }
  }, [activeTab, fetchPlanInfo, isProfileDialogOpen, planInfo, planLoading])

  const handleManageSubscription = async () => {
    const hasSubscription = planInfo?.hasSubscription
    const isFree =
      !planInfo || planInfo.effectivePlan === "free" || hasSubscription === false

    if (isFree) {
      setIsProfileDialogOpen(false)
      router.push("/#pricing")
      return
    }

    setPortalLoading(true)
    setPortalError(null)

    try {
      const response = await fetch("/api/lemonsqueezy/portal")
      if (!response.ok) {
        throw new Error(`Portal fetch failed: ${response.status}`)
      }
      const data = (await response.json()) as { url?: string }
      if (!data?.url) {
        throw new Error("Missing portal URL")
      }
      // Open subscription management in a new tab to preserve the current session flow.
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("Portal open failed", error)
      setPortalError("We couldn't open the subscription portal. Please try again.")
    } finally {
      setPortalLoading(false)
    }
  }

  const handleUpgradePlan = () => {
    setIsProfileDialogOpen(false)
    router.push("/#pricing")
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      const response = await fetch("/api/account/delete", { method: "DELETE" })
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`)
      }
      setIsDeleteDialogOpen(false)
      await handleSignOut()
      setIsProfileDialogOpen(false)
      router.push("/?account_deleted=1")
    } catch (error) {
      console.error("Delete account flow failed", error)
      setDeleteError("Account deletion failed. Please try again or contact support.")
    } finally {
      setDeleteLoading(false)
    }
  }

  const planLabel = planInfo?.effectivePlan === "plus" ? "Plus" : "Free"
  const planStatusLabel = planInfo?.planStatus
    ? planInfo.planStatus === "active"
      ? "Active"
      : planInfo.planStatus
    : null
  const renewalLabel = planInfo?.renewalAt
    ? new Date(planInfo.renewalAt).toLocaleDateString()
    : null
  const cancelLabel = planInfo?.cancelAt ? new Date(planInfo.cancelAt).toLocaleDateString() : null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "flex items-center justify-center hover:bg-transparent focus-visible:bg-transparent active:bg-transparent",
                showUserInfo
                  ? "w-full justify-start gap-3 rounded-lg px-2.5 py-2.5 text-left"
                  : "md:h-8 md:p-0"
              )}
            >
              <Avatar className="h-8 w-8 rounded-full">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="rounded-full bg-gray-500">
                  {avatarUrl ? initials : <UserRound className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              {showUserInfo && (
                <div className="min-w-0 text-left leading-tight">
                  <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{email}</div>
                </div>
              )}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onSelect={(event) => {
                event.preventDefault()
                handleOpenProfile()
              }}
            >
              <Settings className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            {metadata.username && (
              <DropdownMenuItem
                className="gap-2"
                onSelect={(event) => {
                  event.preventDefault()
                  setIsMenuOpen(false)
                  router.push(`/u/${metadata.username}`)
                }}
              >
                <UserRound className="h-4 w-4" /> My Profile
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-default focus:bg-transparent focus:text-foreground"
              onSelect={(event) => event.preventDefault()}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span>Dark mode</span>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={handleThemeToggle}
                  disabled={!isMounted}
                  aria-label="Toggle dark mode"
                />
              </div>
            </DropdownMenuItem>
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
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-2xl overflow-hidden p-0">
          <div className="flex flex-col items-start gap-2 border-b border-muted bg-muted/40 px-4 py-3 sm:hidden">
            <span className="text-xs font-semibold text-muted-foreground">Settings</span>
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "account" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setActiveTab("account")}
                aria-label="Account"
                className="h-10 w-10 rounded-full"
              >
                <UserRound className="h-5 w-5" />
              </Button>
              <Button
                variant={activeTab === "subscription" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => {
                  setActiveTab("subscription")
                  if (!planInfo && !planLoading) {
                    void fetchPlanInfo()
                  }
                }}
                aria-label="Subscription"
                className="h-10 w-10 rounded-full"
              >
                <Zap className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex h-full min-h-[420px]">
            <aside className="hidden w-56 shrink-0 border-r border-muted bg-muted/40 p-4 sm:flex sm:flex-col gap-2 text-sm">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Settings</div>
              <button
                type="button"
                onClick={() => setActiveTab("account")}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
                  activeTab === "account"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserRound className="h-4 w-4" />
                <span>Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("subscription")
                  if (!planInfo && !planLoading) {
                    void fetchPlanInfo()
                  }
                }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
                  activeTab === "subscription"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="h-4 w-4" />
                <span>Subscription</span>
              </button>
            </aside>

            <div className="flex-1 space-y-4 p-5 sm:p-6">
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-xl font-semibold">
                  {activeTab === "account" ? "Account" : "Subscription"} settings
                </DialogTitle>
                <DialogDescription>
                  {activeTab === "account"
                    ? "Manage your profile and account security."
                    : "Review your plan status and manage billing."}
                </DialogDescription>
              </DialogHeader>

              {activeTab === "account" ? (
                <div className="space-y-4">
                  <div className="flex border border-muted items-center gap-3 rounded-lg bg-muted/30 p-4">
                    <Avatar className="h-12 w-12 rounded-lg">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                      <AvatarFallback className="rounded-lg text-base">
                        {avatarUrl ? initials : <UserRound className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold leading-none">{displayName}</span>
                      <span className="text-xs text-muted-foreground leading-none">{email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          uxarchive.app/u/
                        </span>
                        <Input
                          id="username"
                          className="pl-32"
                          value={isEditingUsername ? pendingUsername : profileUsername || (metadata.username ?? "")}
                          onChange={(e) => setPendingUsername(e.target.value)}
                          disabled={!isEditingUsername || isSavingUsername}
                        />
                      </div>
                      {isEditingUsername ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSaveUsername}
                            disabled={isSavingUsername}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingUsername(false)
                              setPendingUsername(profileUsername)
                              setUsernameMessage(null)
                            }}
                            disabled={isSavingUsername}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditingUsername(true)
                              setPendingUsername(profileUsername || (metadata.username ?? ""))
                            }}
                          >
                            Edit
                          </Button>
                          {(profileUsername || metadata.username) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="View public profile"
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <a
                                href={`/u/${profileUsername || metadata.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {usernameMessage && (
                      <p className={cn("text-xs", usernameMessage.type === "warning" ? "text-amber-500" : "text-destructive")}>
                        {usernameMessage.text}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This is your public profile URL. It must be unique.
                    </p>
                  </div>

                  <div className="h-px bg-border my-4" />

                  <p className="text-xs text-destructive">
                    Deleting your account removes workspaces and patterns and cannot be undone.
                  </p>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? "Deleting..." : "Delete account"}
                    </Button>
                    {user ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          void handleSignOut()
                          setIsProfileDialogOpen(false)
                        }}
                      >
                        Log out
                      </Button>
                    ) : null}
                  </div>
                  {deleteError ? (
                    <p className="text-right text-xs text-destructive">{deleteError}</p>
                  ) : null}

                  <AlertDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={(open) => {
                      if (!deleteLoading) {
                        setIsDeleteDialogOpen(open)
                      }
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete account?</AlertDialogTitle>
                        <AlertDialogDescription className="text-destructive">
                          This will delete all workspaces, patterns, and related data. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={deleteLoading}
                          className="bg-destructive text-destructive hover:bg-destructive/90"
                        >
                          {deleteLoading ? "Deleting..." : "Delete account"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-muted bg-muted/20 p-4 text-sm space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="rounded-full bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
                          {planLoading ? "Loading..." : planLabel}
                        </span>
                      </div>
                      {planStatusLabel ? (
                        <span className="text-xs text-muted-foreground">{planStatusLabel}</span>
                      ) : null}
                    </div>
                    {renewalLabel ? (
                      <p className="text-xs text-muted-foreground">Next billing: {renewalLabel}</p>
                    ) : null}
                    {cancelLabel ? (
                      <p className="text-xs text-muted-foreground">Cancellation date: {cancelLabel}</p>
                    ) : null}
                    {planError ? (
                      <p className="text-xs text-destructive">{planError}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {
                      !planLoading && planInfo && planInfo.effectivePlan !== "plus" ? (
                        <Button variant="default" onClick={handleUpgradePlan}>
                          Upgrade plan
                        </Button>
                      ) : (
                        <Button onClick={handleManageSubscription} disabled={portalLoading || planLoading}>
                          {planLoading
                            ? "Checking..."
                            : portalLoading
                              ? "Opening..."
                              : "Manage subscription"}
                        </Button>
                      )
                    }
                  </div>
                  {portalError ? (
                    <p className="text-right text-xs text-destructive">{portalError}</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  )
}
