import Link from 'next/link'
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/actions/auth.actions'
import { getSessionUser } from '@/lib/rbac/guards'

export default async function UnauthorizedPage() {
  const user = await getSessionUser()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center text-center max-w-md space-y-6">
        {/* Icon */}
        <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-12 w-12 text-destructive" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You don&apos;t have permission to view this page.
            {user?.roleName && (
              <>
                {' '}Your current role is{' '}
                <span className="font-semibold text-foreground capitalize bg-muted px-1.5 py-0.5 rounded-md">
                  {user.roleName.replace('_', ' ')}
                </span>
                .
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button asChild variant="outline" className="flex-1">
            <Link href={getHomePage(user?.roleName)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to My Dashboard
            </Link>
          </Button>
          <form action={logout} className="flex-1">
            <Button type="submit" variant="destructive" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function getHomePage(role?: string): string {
  const ROLE_HOME: Record<string, string> = {
    owner: '/admin/dashboard',
    admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    reception: '/admin/bookings',
    cashier: '/admin/pos',
    kitchen: '/admin/kitchen',
    waiter: '/admin/tables',
    housekeeping: '/admin/rooms',
    inventory_manager: '/admin/inventory',
    viewer: '/admin/dashboard',
  }
  return ROLE_HOME[role ?? ''] ?? '/admin/dashboard'
}
