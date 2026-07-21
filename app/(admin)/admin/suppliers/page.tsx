import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getSuppliers } from '@/lib/actions/suppliers.actions'
import SuppliersClient from './suppliers-client'

export default async function SuppliersPage() {
  await requirePermission(PERMISSIONS.INVENTORY_READ)
  const { data: suppliers } = await getSuppliers()
  return <SuppliersClient initialSuppliers={suppliers ?? []} />
}
