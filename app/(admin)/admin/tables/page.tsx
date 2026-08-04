import { requirePermission, checkPermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getTables } from '@/lib/actions/orders.actions'
import TablesClient from './tables-client'

export const dynamic = 'force-dynamic'

export default async function TablesPage() {
  await requirePermission(PERMISSIONS.TABLES_READ)
  const canAccessPOS = await checkPermission(PERMISSIONS.POS_ACCESS)
  const { data: tables } = await getTables()
  return <TablesClient tables={tables ?? []} canAccessPOS={canAccessPOS} />
}
