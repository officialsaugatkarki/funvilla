import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getInventory, getLowStockItems } from '@/lib/actions/inventory.actions'
import InventoryClient from './inventory-client'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  await requirePermission(PERMISSIONS.INVENTORY_READ)
  const [{ data: inventory }, { data: lowStock }] = await Promise.all([
    getInventory(),
    getLowStockItems()
  ])
  return <InventoryClient inventory={inventory ?? []} lowStock={lowStock ?? []} />
}
