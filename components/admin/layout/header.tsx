'use client'

import Link from 'next/link'
import { Search, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { logout } from '@/lib/actions/auth.actions'
import type { SessionUser } from '@/lib/types'
import NotificationsBell from '@/components/admin/notifications-bell'

export function AdminHeader({ user }: { user: SessionUser }) {
  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : 'U'
  const displayName = user.email || 'User'

  return (
    <header className="h-14 border-b bg-background flex items-center gap-3 px-4 shrink-0">
      {/* Mobile hamburger — the actual <MobileSidebar> is rendered in the layout,
          this space is intentionally left for the trigger inside the fixed MobileSidebar component.
          We use a portal-style placeholder so the layout doesn't shift. */}
      <div className="md:hidden w-9 h-9" id="mobile-sidebar-trigger-portal" />

      {/* Search */}
      <div className="hidden md:flex relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full bg-muted/50 pl-9 h-9 text-sm"
        />
      </div>

      <div className="flex-1 md:flex-none" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-accent"
        >
          <Home className="h-3.5 w-3.5" />
          View Site
        </Link>

        <NotificationsBell restaurantId={user.restaurantId} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground capitalize">
                  {user.roleName}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">Profile & Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logout} className="w-full">
                <button type="submit" className="w-full text-left cursor-pointer text-destructive">
                  Log out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
