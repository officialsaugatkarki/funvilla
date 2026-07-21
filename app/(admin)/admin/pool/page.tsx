import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getPoolTickets } from '@/lib/actions/bookings.actions'
import PoolClient from './pool-client'

export const dynamic = 'force-dynamic'

export default async function PoolPage() {
  await requirePermission(PERMISSIONS.POOL_ACCESS)
  const { data: tickets } = await getPoolTickets()
  return <PoolClient tickets={tickets ?? []} />
}
