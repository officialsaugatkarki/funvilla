'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import type { ApiResponse, InventoryItem, InventoryMovement } from '@/lib/types'
import { z } from 'zod'

const InventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  unit: z.string().min(1).max(50),
  quantity: z.number().min(0),
  min_quantity: z.number().min(0).default(5),
  cost_per_unit: z.number().min(0),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  supplier_id: z.string().uuid().nullable().optional(),
})

const AdjustmentSchema = z.object({
  inventoryId: z.string().uuid(),
  type: z.enum(['purchase', 'consumption', 'waste', 'adjustment']),
  quantity: z.number(),
  notes: z.string().optional(),
  costPerUnit: z.number().optional(),
})

export async function getInventory(search?: string): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_READ)
  const supabase = await createClient()

  // NOTE: The Supabase table is named 'inventory' (not 'inventory_items')
  let query = supabase
    .from('inventory')
    .select('*, suppliers(name)')
    .eq('restaurant_id', user.restaurantId)
    .eq('is_active', true)
    .order('name')

  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }

  // Enrich with low_stock flags
  const enriched = (data || []).map(item => ({
    ...item,
    is_low_stock: item.quantity <= item.min_quantity && item.quantity > 0,
    is_out_of_stock: item.quantity <= 0,
    supplier_name: item.suppliers?.name ?? null,
  }))

  return { data: enriched, error: null }
}

export async function createInventoryItem(formData: unknown): Promise<ApiResponse<InventoryItem>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE)
  const result = InventoryItemSchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory')
    .insert({ ...result.data, restaurant_id: user.restaurantId })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/inventory')
  return { data, error: null }
}

export async function updateInventoryItem(id: string, formData: unknown): Promise<ApiResponse<InventoryItem>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE)
  const result = InventoryItemSchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory')
    .update(result.data)
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/inventory')
  return { data, error: null }
}

export async function adjustInventory(input: z.infer<typeof AdjustmentSchema>): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_ADJUST)
  const result = AdjustmentSchema.safeParse(input)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()

  // Insert movement record
  const { error: movErr } = await supabase.from('inventory_movements').insert({
    restaurant_id: user.restaurantId,
    inventory_id: result.data.inventoryId,
    type: result.data.type,
    quantity: result.data.quantity,
    notes: result.data.notes,
    cost_per_unit: result.data.costPerUnit,
    created_by: user.id,
  })
  if (movErr) return { data: null, error: movErr.message }

  // Update actual quantity
  const delta = ['consumption', 'waste'].includes(result.data.type)
    ? -Math.abs(result.data.quantity)
    : Math.abs(result.data.quantity)

  const { error: qtyErr } = await supabase.rpc('increment_inventory', {
    p_id: result.data.inventoryId,
    p_delta: delta,
  })
  // Graceful fallback if RPC doesn't exist yet
  if (qtyErr) {
    const { data: current } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('id', result.data.inventoryId)
      .single()
    await supabase
      .from('inventory')
      .update({ quantity: Math.max(0, (current?.quantity ?? 0) + delta) })
      .eq('id', result.data.inventoryId)
  }

  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: `inventory.${result.data.type}`, resourceType: 'inventory', resourceId: result.data.inventoryId })
  revalidatePath('/admin/inventory')
  return { data: null, error: null }
}

export async function getInventoryMovements(inventoryId: string): Promise<ApiResponse<InventoryMovement[]>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('inventory_id', inventoryId)
    .eq('restaurant_id', user.restaurantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getLowStockItems(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select('*, suppliers(name)')
    .eq('restaurant_id', user.restaurantId)
    .eq('is_active', true)

  if (error) return { data: null, error: error.message }

  const lowStock = (data || []).filter(item => item.quantity <= item.min_quantity)
  return { data: lowStock, error: null }
}

export async function getRecipes(menuItemId?: string): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_READ)
  const supabase = await createClient()

  // 'inventory' is the actual table name (the join alias key in results will still be 'inventory')
  let query = supabase
    .from('recipes')
    .select('*, inventory(*), menu_items(name)')
    
  if (menuItemId) {
    query = query.eq('menu_item_id', menuItemId)
  }

  const { data, error } = await query
  
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function addRecipeIngredient(payload: {
  menuItemId: string
  inventoryId: string
  quantity: number
  unit: string
}): Promise<ApiResponse<any>> {
  const user = await requirePermission(PERMISSIONS.MENU_UPDATE)
  const supabase = await createClient()

  const { data, error } = await supabase.from('recipes').insert({
    menu_item_id: payload.menuItemId,
    inventory_id: payload.inventoryId,
    quantity: payload.quantity,
    unit: payload.unit
  }).select().single()

  if (error) return { data: null, error: error.message }
  
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'recipe.ingredient_added', resourceType: 'menu_item', resourceId: payload.menuItemId })
  revalidatePath('/admin/inventory/recipes')
  return { data, error: null }
}

export async function removeRecipeIngredient(recipeId: string): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.MENU_UPDATE)
  const supabase = await createClient()

  const { error } = await supabase.from('recipes').delete().eq('id', recipeId)

  if (error) return { data: null, error: error.message }
  
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'recipe.ingredient_removed' })
  revalidatePath('/admin/inventory/recipes')
  return { data: null, error: null }
}

export async function deductInventoryForOrder(orderId: string): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.ORDERS_UPDATE)
  const supabase = await createClient()

  // 1. fetch order items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (!orderItems?.length) return { data: null, error: null }

  // 2. Map deductions
  const deductions = new Map<string, number>()

  for (const item of orderItems) {
    // skip if cancelled
    if (item.status === 'cancelled') continue

    const { data: recipes } = await supabase
      .from('recipes')
      .select('*')
      .eq('menu_item_id', item.menu_item_id)
      
    if (recipes) {
      for (const recipe of recipes) {
        const totalQty = recipe.quantity * item.quantity
        deductions.set(recipe.inventory_id, (deductions.get(recipe.inventory_id) || 0) + totalQty)
      }
    }
  }

  // 3. Apply deductions (using 'inventory' — the correct table name)
  for (const [inventoryId, deductQty] of Array.from(deductions.entries())) {
    const { data: current } = await supabase.from('inventory').select('quantity').eq('id', inventoryId).single()
    if (current) {
      await supabase.from('inventory').update({
        quantity: Math.max(0, current.quantity - deductQty)
      }).eq('id', inventoryId)
      
      await supabase.from('inventory_movements').insert({
        restaurant_id: user.restaurantId,
        inventory_id: inventoryId,
        type: 'consumption',
        quantity: -deductQty,
        notes: `Auto-deducted for order ${orderId}`,
        created_by: user.id
      })
    }
  }

  return { data: null, error: null }
}
