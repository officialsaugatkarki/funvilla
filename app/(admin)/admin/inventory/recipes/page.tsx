import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { createClient } from '@/lib/supabase/server'
import RecipesClient from './recipes-client'

export const dynamic = 'force-dynamic'

export default async function RecipesPage() {
  const user = await requirePermission(PERMISSIONS.INVENTORY_READ)
  const supabase = await createClient()

  const [
    { data: menuItems },
    { data: inventoryItems },
    { data: recipes }
  ] = await Promise.all([
    supabase.from('menu_items').select('*').eq('restaurant_id', user.restaurantId).order('name'),
    supabase.from('inventory_items').select('*').eq('restaurant_id', user.restaurantId).order('name'),
    supabase.from('recipes').select('*, inventory_items(*), menu_items(*)') // Restaurant ID is implicit via RLS but recipes doesn't have it, it's joined via menu_items
  ])

  // Filter recipes to only those belonging to this restaurant's menu items
  const validMenuItemIds = new Set((menuItems || []).map(m => m.id))
  const filteredRecipes = (recipes || []).filter(r => validMenuItemIds.has(r.menu_item_id))

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recipe Mapping</h1>
            <p className="text-muted-foreground mt-2">
              Map inventory items to menu items for automatic stock deduction.
            </p>
          </div>

          <RecipesClient 
            menuItems={menuItems ?? []}
            inventoryItems={inventoryItems ?? []}
            recipes={filteredRecipes}
          />
        </div>
      </div>
    </div>
  )
}
