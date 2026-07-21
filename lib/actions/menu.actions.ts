'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import { MenuCategorySchema, MenuItemSchema } from '@/lib/validations/menu'
import type { ApiResponse, MenuCategory, MenuItem } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
export async function getMenuCategories(): Promise<ApiResponse<MenuCategory[]>> {
  const supabase = await createClient()
  const user = await requirePermission(PERMISSIONS.MENU_READ)

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .order('sort_order')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createMenuCategory(formData: unknown): Promise<ApiResponse<MenuCategory>> {
  const user = await requirePermission(PERMISSIONS.MENU_CREATE)
  const result = MenuCategorySchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ ...result.data, restaurant_id: user.restaurantId })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'menu_category.created', resourceType: 'menu_category', resourceId: data.id })
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
  return { data, error: null }
}

export async function updateMenuCategory(id: string, formData: unknown): Promise<ApiResponse<MenuCategory>> {
  const user = await requirePermission(PERMISSIONS.MENU_UPDATE)
  const result = MenuCategorySchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_categories')
    .update(result.data)
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'menu_category.updated', resourceType: 'menu_category', resourceId: id })
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
  return { data, error: null }
}

export async function deleteMenuCategory(id: string): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.MENU_DELETE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'menu_category.deleted', resourceType: 'menu_category', resourceId: id })
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
  return { data: null, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS
// ─────────────────────────────────────────────────────────────────────────────
export async function getMenuItems(categoryId?: string): Promise<ApiResponse<MenuItem[]>> {
  const user = await requirePermission(PERMISSIONS.MENU_READ)
  const supabase = await createClient()

  let query = supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .order('sort_order')

  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createMenuItem(formData: unknown): Promise<ApiResponse<MenuItem>> {
  const user = await requirePermission(PERMISSIONS.MENU_CREATE)
  const result = MenuItemSchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .insert({ ...result.data, restaurant_id: user.restaurantId })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'menu_item.created', resourceType: 'menu_item', resourceId: data.id })
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
  return { data, error: null }
}

export async function updateMenuItem(id: string, formData: unknown): Promise<ApiResponse<MenuItem>> {
  const user = await requirePermission(PERMISSIONS.MENU_UPDATE)
  const result = MenuItemSchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .update(result.data)
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'menu_item.updated', resourceType: 'menu_item', resourceId: id })
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
  return { data, error: null }
}

export async function deleteMenuItem(id: string): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.MENU_DELETE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }
  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'menu_item.deleted', resourceType: 'menu_item', resourceId: id })
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
  return { data: null, error: null }
}

export async function toggleMenuItemAvailability(id: string, isAvailable: boolean): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.MENU_UPDATE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
  return { data: null, error: null }
}
