import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { createClient } from '@/lib/supabase/server'
import UsersClient from './users-client'

export default async function UsersPage() {
  const user = await requirePermission(PERMISSIONS.USERS_MANAGE)
  const supabase = await createClient()

  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .order('name')

  return <UsersClient roles={roles ?? []} />
}
