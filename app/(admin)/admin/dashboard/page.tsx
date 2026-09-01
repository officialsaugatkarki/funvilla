import { requireAuth } from '@/lib/rbac/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Utensils, Users, ShoppingCart, DollarSign, Droplets } from 'lucide-react'
import { getDashboardMetrics, getSettings } from '@/lib/actions/admin.actions'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const user = await requireAuth()
  
  const { data: metrics } = await getDashboardMetrics(user.restaurantId)
  const { data: settings } = await getSettings()
  const currency = settings?.currency_symbol || 'NPR'

  // Fetch today's swimming stats
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data: swimmingTickets } = await supabase
    .from('swimming_tickets')
    .select('price')
    .eq('restaurant_id', user.restaurantId)
    .eq('valid_date', today)

  const swimmingCount   = swimmingTickets?.length ?? 0
  const swimmingRevenue = swimmingTickets?.reduce((sum, t) => sum + (t.price || 0), 0) ?? 0

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
            <CardTitle className="text-sm font-medium">Staff Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Live</div>
            <p className="text-xs text-muted-foreground">RBAC Enforced</p>
          </CardContent>
        </Card>
      </div>

      {/* Swimming stats row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Swimming Tickets Today</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{swimmingCount}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">tickets issued today</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Swimming Revenue Today</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{currency} {swimmingRevenue.toLocaleString()}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">from swimming tickets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
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
             <p className="text-sm text-muted-foreground">Navigate using the sidebar to access POS, Swimming, Rooms and other modules.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
