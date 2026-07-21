import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getPurchaseOrders } from '@/lib/actions/purchase-orders.actions'
import { getSuppliers } from '@/lib/actions/suppliers.actions'
import { getInventory } from '@/lib/actions/inventory.actions'
import POClient from './po-client'

export default async function PurchaseOrdersPage() {
  await requirePermission(PERMISSIONS.INVENTORY_READ)
  const [{ data: pos }, { data: suppliers }, { data: inventory }] = await Promise.all([
    getPurchaseOrders(),
    getSuppliers(),
    getInventory()
  ])
  return <POClient initialPOs={pos ?? []} suppliers={suppliers ?? []} inventory={inventory ?? []} />
}
