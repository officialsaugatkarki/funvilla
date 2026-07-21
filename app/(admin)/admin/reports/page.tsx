import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { createClient } from '@/lib/supabase/server'
import { getRevenueReport } from '@/lib/actions/admin.actions'
import ReportsClient from './reports-client'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const user = await requirePermission(PERMISSIONS.REPORTS_READ)
  const supabase = await createClient()

  // Fetch all report data in parallel
  const [
    revenueResult,
    { data: inventoryData },
    { data: bookingsData },
    { data: poolData },
    { data: staffData }
  ] = await Promise.all([
    getRevenueReport('month'),
    supabase.from('inventory').select('*').eq('restaurant_id', user.restaurantId).order('name'),
    supabase.from('room_bookings').select('*, rooms(room_number)').eq('restaurant_id', user.restaurantId).order('created_at', { ascending: false }).limit(100),
    supabase.from('pool_tickets').select('*').eq('restaurant_id', user.restaurantId).order('valid_date', { ascending: false }).limit(200),
    supabase.from('staff').select('*, profiles(full_name)').eq('restaurant_id', user.restaurantId)
  ])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive overview of your restaurant's performance across all departments.
            </p>
          </div>

          <ReportsClient 
            initialRevenueData={revenueResult.data ?? []}
            inventoryData={inventoryData ?? []}
            bookingsData={bookingsData ?? []}
            poolData={poolData ?? []}
            staffData={staffData ?? []}
          />
        </div>
      </div>
    </div>
  )
}
