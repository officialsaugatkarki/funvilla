import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { createClient } from '@/lib/supabase/server'
import MenuManagementClient from './menu-client'

export default async function AdminMenuPage() {
  const user = await requirePermission(PERMISSIONS.MENU_READ)
  const supabase = await createClient()

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('restaurant_id', user.restaurantId).order('sort_order'),
    supabase.from('menu_items').select('*, menu_categories(name)').eq('restaurant_id', user.restaurantId).order('sort_order'),
  ])

  return <MenuManagementClient categories={categories ?? []} items={items ?? []} />
}
