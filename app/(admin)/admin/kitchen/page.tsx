import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getKitchenOrders } from '@/lib/actions/orders.actions'
import KitchenClient from './kitchen-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function KitchenPage() {
  await requirePermission(PERMISSIONS.KITCHEN_ACCESS)
  const { data: orders } = await getKitchenOrders()
  return <KitchenClient initialOrders={orders ?? []} />
}
