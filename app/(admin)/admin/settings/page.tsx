import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { getSettings, getRestaurant } from '@/lib/actions/admin.actions'
import SettingsClient from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_READ)
  
  const [{ data: settings }, { data: restaurant }] = await Promise.all([
    getSettings(),
    getRestaurant()
  ])
  
  return <SettingsClient settings={settings ?? {}} restaurant={restaurant ?? {}} />
}
