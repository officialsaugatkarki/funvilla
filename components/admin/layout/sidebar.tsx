'use client'

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
  CalendarDays,
  Users,
  BadgeCheck,
  BarChart3,
  Settings,
  Shield,
  Truck,
  FileText,
} from 'lucide-react'
import type { RoleName } from '@/lib/types'

// Map roles to allowed paths (simplified for UI rendering)
// Real security is enforced server-side.
const ROLE_PATHS: Record<RoleName, string[]> = {
  owner: ['*'],
  admin: ['*'],
  manager: [
    '/admin/dashboard', '/admin/menu', '/admin/orders', '/admin/pos',
    '/admin/kitchen', '/admin/tables', '/admin/rooms', '/admin/bookings',
    '/admin/pool', '/admin/inventory', '/admin/customers', '/admin/employees',
    '/admin/reports', '/admin/settings'
  ],
  reception: ['/admin/dashboard', '/admin/rooms', '/admin/bookings', '/admin/pool', '/admin/customers', '/admin/orders'],
  cashier: ['/admin/dashboard', '/admin/pos', '/admin/orders', '/admin/tables', '/admin/customers'],
  kitchen: ['/admin/kitchen', '/admin/orders', '/admin/menu'],
  waiter: ['/admin/dashboard', '/admin/orders', '/admin/tables', '/admin/menu', '/admin/customers'],
  housekeeping: ['/admin/rooms', '/admin/bookings'],
  inventory_manager: ['/admin/dashboard', '/admin/inventory', '/admin/menu', '/admin/reports'],
  viewer: ['/admin/dashboard', '/admin/menu', '/admin/orders', '/admin/rooms', '/admin/bookings', '/admin/inventory', '/admin/customers', '/admin/reports'],
}

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'POS', href: '/admin/pos', icon: ShoppingCart },
  { name: 'Orders', href: '/admin/orders', icon: Package },
  { name: 'Kitchen', href: '/admin/kitchen', icon: ChefHat },
  { name: 'Menu', href: '/admin/menu', icon: UtensilsCrossed },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Suppliers', href: '/admin/suppliers', icon: Truck },
  { name: 'Purchase Orders', href: '/admin/purchase-orders', icon: FileText },
  { name: 'Rooms', href: '/admin/rooms', icon: BedDouble },
  { name: 'Bookings', href: '/admin/bookings', icon: CalendarDays },
  { name: 'Pool', href: '/admin/pool', icon: Waves },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Staff', href: '/admin/employees', icon: BadgeCheck },
  { name: 'Users', href: '/admin/users', icon: Shield },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar({ role }: { role: RoleName }) {
  const pathname = usePathname()
  const allowedPaths = ROLE_PATHS[role] || []
  
  const visibleItems = NAV_ITEMS.filter(item => 
    allowedPaths.includes('*') || allowedPaths.includes(item.href)
  )

  return (
    <aside className="w-64 bg-background border-r flex flex-col hidden md:flex">
      <div className="p-6 border-b">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">K</span>
          </div>
          <span className="font-semibold text-xl tracking-tight">Khukuri HMP</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-secondary text-secondary-foreground" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
