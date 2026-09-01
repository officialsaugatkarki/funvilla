import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getSwimmingTickets } from '@/lib/actions/bookings.actions'
import SwimmingClient from './swimming-client'

export const dynamic = 'force-dynamic'

export default async function SwimmingPage() {
  await requirePermission(PERMISSIONS.SWIMMING_ACCESS)
  const { data: tickets } = await getSwimmingTickets()
  return <SwimmingClient tickets={tickets ?? []} />
}
