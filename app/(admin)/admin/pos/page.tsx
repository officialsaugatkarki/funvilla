import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrdersForPOS } from '@/lib/actions/orders.actions'
import POSClient from './pos-client'

export default async function POSPage() {
  const user = await requirePermission(PERMISSIONS.POS_ACCESS)
  const supabase = await createClient()

  const [
    { data: categories },
    { data: items },
    { data: tables },
    { data: discounts },
    { data: activeOrders },
  ] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('restaurant_id', user.restaurantId).eq('is_active', true).order('sort_order'),
    supabase.from('menu_items').select('*, menu_categories(name)').eq('restaurant_id', user.restaurantId).eq('is_available', true).order('sort_order'),
    supabase.from('restaurant_tables').select('*').eq('restaurant_id', user.restaurantId).eq('is_active', true).order('table_number'),
    supabase.from('discounts').select('*').eq('restaurant_id', user.restaurantId).eq('is_active', true),
    getActiveOrdersForPOS(),
  ])

  const { data: settings } = await supabase
    .from('settings')
    .select('tax_rate, service_charge_rate')
    .eq('restaurant_id', user.restaurantId)
    .single()

  return (
    <POSClient
      categories={categories ?? []}
      items={items ?? []}
      tables={tables ?? []}
      discounts={discounts ?? []}
      initialActiveOrders={activeOrders ?? []}
      taxRate={settings?.tax_rate ?? 0}
      serviceChargeRate={settings?.service_charge_rate ?? 0}
    />
  )
}
