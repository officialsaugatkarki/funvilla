import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getOrders } from '@/lib/actions/orders.actions'
import OrdersClient from './orders-client'

export default async function OrdersPage() {
  await requirePermission(PERMISSIONS.ORDERS_READ)
  
  // Pre-fetch today's orders
  const { data: initialOrders } = await getOrders({ limit: 100 })

  return <OrdersClient initialOrders={(initialOrders as any) ?? []} />
}
