'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Package,
  BedDouble,
  Waves,
  Droplets,
  CalendarDays,
  Users,
  BadgeCheck,
  BarChart3,
  Settings,
  Shield,
  Truck,
  FileText,
  X,
  Menu,
} from 'lucide-react'
import type { RoleName } from '@/lib/types'

// Map roles to allowed paths. Real security is enforced server-side.
const ROLE_PATHS: Record<RoleName, string[]> = {
  owner: ['/admin/dashboard', '/admin/pos', '/admin/swimming', '/admin/rooms', '/admin/menu', '/admin/settings', '/admin/users', '/admin/employees'],
  admin: ['/admin/dashboard', '/admin/pos', '/admin/swimming', '/admin/rooms', '/admin/menu', '/admin/settings', '/admin/users', '/admin/employees'],
  manager: [
    '/admin/dashboard', '/admin/menu', '/admin/orders', '/admin/pos',
    '/admin/kitchen', '/admin/tables', '/admin/rooms', '/admin/bookings',
    '/admin/pool', '/admin/swimming', '/admin/inventory', '/admin/customers', '/admin/employees',
    '/admin/reports', '/admin/settings',
  ],
  reception: ['/admin/dashboard', '/admin/rooms', '/admin/bookings', '/admin/pool', '/admin/swimming', '/admin/customers', '/admin/orders'],
  cashier: ['/admin/dashboard', '/admin/pos', '/admin/orders', '/admin/tables', '/admin/customers'],
  kitchen: ['/admin/kitchen', '/admin/orders', '/admin/menu'],
  waiter: ['/admin/dashboard', '/admin/orders', '/admin/tables', '/admin/menu', '/admin/customers'],
  housekeeping: ['/admin/rooms', '/admin/bookings'],
  inventory_manager: ['/admin/dashboard', '/admin/inventory', '/admin/menu', '/admin/reports'],
  viewer: ['/admin/dashboard', '/admin/menu', '/admin/orders', '/admin/rooms', '/admin/bookings', '/admin/inventory', '/admin/customers', '/admin/reports'],
}

const NAV_ITEMS = [
  { name: 'Dashboard',       href: '/admin/dashboard',        icon: LayoutDashboard },
  { name: 'POS',             href: '/admin/pos',              icon: ShoppingCart },
  { name: 'Orders',          href: '/admin/orders',           icon: Package },
  { name: 'Kitchen',         href: '/admin/kitchen',          icon: ChefHat },
  { name: 'Menu',            href: '/admin/menu',             icon: UtensilsCrossed },
  { name: 'Inventory',       href: '/admin/inventory',        icon: Package },
  { name: 'Suppliers',       href: '/admin/suppliers',        icon: Truck },
  { name: 'Purchase Orders', href: '/admin/purchase-orders',  icon: FileText },
  { name: 'Rooms',           href: '/admin/rooms',            icon: BedDouble },
  { name: 'Bookings',        href: '/admin/bookings',         icon: CalendarDays },
  { name: 'Pool',            href: '/admin/pool',             icon: Waves },
  { name: 'Swimming',        href: '/admin/swimming',         icon: Droplets },
  { name: 'Customers',       href: '/admin/customers',        icon: Users },
  { name: 'Staff',           href: '/admin/employees',        icon: BadgeCheck },
  { name: 'Users',           href: '/admin/users',            icon: Shield },
  { name: 'Reports',         href: '/admin/reports',          icon: BarChart3 },
  { name: 'Settings',        href: '/admin/settings',         icon: Settings },
]

// Maps each role to its home page
const ROLE_HOME: Record<RoleName, string> = {
  owner:              '/admin/dashboard',
  admin:              '/admin/dashboard',
  manager:            '/admin/dashboard',
  reception:          '/admin/bookings',
  cashier:            '/admin/pos',
  kitchen:            '/admin/kitchen',
  waiter:             '/admin/tables',
  housekeeping:       '/admin/rooms',
  inventory_manager:  '/admin/inventory',
  viewer:             '/admin/dashboard',
}

function SidebarContent({
  role,
  onNavClick,
}: {
  role: RoleName
  onNavClick?: () => void
}) {
  const pathname = usePathname()
  const allowedPaths = ROLE_PATHS[role] || []
  const homeHref = ROLE_HOME[role] ?? '/admin/dashboard'

  const visibleItems = NAV_ITEMS.filter(
    (item) => allowedPaths.includes('*') || allowedPaths.includes(item.href)
  )

  return (
    <>
      <div className="p-5 border-b flex items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-2" onClick={onNavClick}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">K</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Khukuri HMP</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Role: {role.replace('_', ' ')}
        </p>
      </div>
    </>
  )
}

export function AdminSidebar({ role }: { role: RoleName }) {
  return (
    <aside className="w-64 bg-background border-r flex-col hidden md:flex shrink-0">
      <SidebarContent role={role} />
    </aside>
  )
}

// Mobile sidebar with overlay
export function MobileSidebar({ role }: { role: RoleName }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button — rendered in this component and exported for the header to use */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-background border-r flex flex-col transform transition-transform duration-300 ease-in-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent role={role} onNavClick={() => setOpen(false)} />
      </aside>
    </>
  )
}
