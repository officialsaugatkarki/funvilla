import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getStaff } from '@/lib/actions/admin.actions'
import { getUsers } from '@/lib/actions/users.actions'
import EmployeesClient from './employees-client'

export default async function EmployeesPage() {
  await requirePermission(PERMISSIONS.EMPLOYEES_READ)
  
  // Need to get staff and also system users for assignment
  const { data: staff } = await getStaff()
  const { data: systemUsers } = await getUsers()

  return <EmployeesClient initialStaff={staff ?? []} systemUsers={systemUsers ?? []} />
}
