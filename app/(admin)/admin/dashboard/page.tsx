import { requireAuth } from '@/lib/rbac/guards'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Utensils, Users, ShoppingCart, DollarSign } from 'lucide-react'
import { getDashboardMetrics, getRevenueReport } from '@/lib/actions/admin.actions'
import { getSettings } from '@/lib/actions/admin.actions'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const user = await requireAuth()
  
  // Fetch real data
  const { data: metrics } = await getDashboardMetrics(user.restaurantId)
  const { data: settings } = await getSettings()
  
  // Hardcoded chart defaults just for UI representation,
  // since Recharts cannot be rendered in Server Component directly
  // we would need a client component for charts. Let's keep it simple for the overview.
  const currency = settings?.currency_symbol || 'NPR'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here's what's happening at your restaurant today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency} {metrics?.todayRevenue?.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground">From paid orders today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.todayOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground">{metrics?.pendingOrders ?? 0} currently pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeBookings ?? 0}</div>
            <p className="text-xs text-muted-foreground">Confirmed room bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Live</div>
            <p className="text-xs text-muted-foreground">RBAC Enforced</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Your business is currently operating normally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-4">
                <Badge variant="default">System Online</Badge>
                <Badge variant="secondary">Role: {user.roleName}</Badge>
             </div>
             <p className="text-sm text-muted-foreground">
               Realtime charts are available in the Reports section.
             </p>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
             <p className="text-sm text-muted-foreground">Navigate using the sidebar to access POS, Kitchen Display, and other modules.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
