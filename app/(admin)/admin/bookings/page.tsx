import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getBookings } from '@/lib/actions/bookings.actions'
import BookingsClient from './bookings-client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const user = await requirePermission(PERMISSIONS.BOOKINGS_READ)
  const supabase = await createClient()

  const [{ data: bookings }, { data: rooms }] = await Promise.all([
    getBookings(),
    supabase
      .from('rooms')
      .select('id, room_number, room_types(name)')
      .eq('restaurant_id', user.restaurantId)
      .eq('is_active', true),
  ])

  return <BookingsClient bookings={bookings ?? []} rooms={rooms ?? []} />
}
