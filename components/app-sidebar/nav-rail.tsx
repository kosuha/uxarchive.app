"use client"

import * as React from "react"
import { Archive } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export const NAV_RAIL_WIDTH = "calc(3rem + 1px)"

export type NavItem = {
  id: string
  title: string
  description?: string
  icon: LucideIcon
}

type SidebarNavRailProps = {
  items: NavItem[]
  activeNavId: string
  onNavItemSelect: (itemId: string) => void
}

export function SidebarNavRail({ items, activeNavId, onNavItemSelect }: SidebarNavRailProps) {
  return (
    <aside
      className="fixed inset-y-0 z-30 hidden border-r border-border/60 bg-sidebar py-2 md:flex md:flex-col"
      style={{ width: NAV_RAIL_WIDTH }}
    >
      <div className="px-1 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="justify-center" aria-label="워크스페이스 홈">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Archive className="size-4" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id} className="flex justify-center">
              <NavRailButton
                item={item}
                isActive={activeNavId === item.id}
                onSelect={() => onNavItemSelect(item.id)}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>
      <div className="border-t border-border/60 pt-2">
        <NavUser />
      </div>
    </aside>
  )
}

type NavRailButtonProps = {
  item: NavItem
  isActive: boolean
  onSelect: () => void
}

function NavRailButton({ item, isActive, onSelect }: NavRailButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={item.title}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
        "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="size-4" />
    </button>
  )
}
