'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import type { ApiResponse } from '@/lib/types'
import { z } from 'zod'

const POSchema = z.object({
  supplierId: z.string().uuid(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    inventoryId: z.string().uuid(),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
  })).min(1)
})

export type POInput = z.infer<typeof POSchema>

export async function getPurchaseOrders(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers(name),
      purchase_order_items(
        id, quantity, unit_price, total_price, received_quantity,
        inventory(name, unit)
      )
    `)
    .eq('restaurant_id', user.restaurantId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createPurchaseOrder(input: POInput): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE)
  const result = POSchema.safeParse(input)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()

  const totalAmount = result.data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

  const { data: po, error } = await supabase.from('purchase_orders').insert({
    restaurant_id: user.restaurantId,
    supplier_id: result.data.supplierId,
    created_by: user.id,
    status: 'draft',
    total_amount: totalAmount,
    expected_date: result.data.expectedDate,
    notes: result.data.notes
  }).select().single()

  if (error) return { data: null, error: error.message }

  const poItems = result.data.items.map(item => ({
    po_id: po.id,
    inventory_id: item.inventoryId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.quantity * item.unitPrice
  }))

  const { error: itemsErr } = await supabase.from('purchase_order_items').insert(poItems)
  if (itemsErr) return { data: null, error: itemsErr.message }

  await logActivity({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: 'Created purchase order',
    resourceType: 'purchase_order',
    resourceId: po.id
  })

  revalidatePath('/admin/purchase-orders')
  return { data: null, error: null }
}
