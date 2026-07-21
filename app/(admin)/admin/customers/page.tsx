import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getCustomers } from '@/lib/actions/admin.actions'
import CustomersClient from './customers-client'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  await requirePermission(PERMISSIONS.CUSTOMERS_READ)
  const { data: customers } = await getCustomers()
  return <CustomersClient customers={customers ?? []} />
}
