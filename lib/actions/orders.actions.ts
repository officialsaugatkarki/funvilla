'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import { deductInventoryForOrder } from './inventory.actions'
import type { ApiResponse, Order, OrderWithDetails, OrderItem, OrderType } from '@/lib/types'
import { z } from 'zod'

const CreateOrderSchema = z.object({
  tableId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery', 'qr']),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  discountId: z.string().uuid().nullable().optional(),
  tipAmount: z.number().min(0).default(0),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    menuItemName: z.string(),
    menuItemPrice: z.number(),
    categoryName: z.string().nullable().optional(),
    quantity: z.number().int().min(1),
    unitPrice: z.number(),
    notes: z.string().optional(),
  })).min(1, 'Order must have at least one item'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>

export async function createOrder(input: CreateOrderInput): Promise<ApiResponse<Order>> {
  const user = await requirePermission(PERMISSIONS.ORDERS_CREATE)
  const result = CreateOrderSchema.safeParse(input)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()

  // Fetch settings for tax/service charge rates
  const { data: settings } = await supabase
    .from('settings')
    .select('tax_rate, service_charge_rate')
    .eq('restaurant_id', user.restaurantId)
    .single()

  const taxRate = settings?.tax_rate ?? 13
  const serviceChargeRate = settings?.service_charge_rate ?? 0

  const subtotal = result.data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const serviceAmount = Math.round(subtotal * (serviceChargeRate / 100) * 100) / 100
  const total = subtotal + taxAmount + serviceAmount + (result.data.tipAmount ?? 0)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: user.restaurantId,
      table_id: result.data.tableId,
      customer_id: result.data.customerId,
      created_by: user.id,
      order_type: result.data.orderType,
      status: 'pending',
      payment_status: 'unpaid',
      subtotal,
      discount_amount: 0,
      tax_amount: taxAmount,
      service_charge_amount: serviceAmount,
      tip_amount: result.data.tipAmount ?? 0,
      total,
      discount_id: result.data.discountId,
      notes: result.data.notes,
      customer_name: result.data.customerName,
      customer_phone: result.data.customerPhone,
    })
    .select()
    .single()

  if (orderError) return { data: null, error: orderError.message }

  // Insert order items
  const itemsToInsert = result.data.items.map(item => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    menu_item_name: item.menuItemName,
    menu_item_price: item.menuItemPrice,
    category_name: item.categoryName ?? null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
    notes: item.notes ?? null,
    status: 'pending' as const,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert)
  if (itemsError) return { data: null, error: itemsError.message }

  // Update table status to occupied if dine_in
  if (result.data.tableId && result.data.orderType === 'dine_in') {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied' })
      .eq('id', result.data.tableId)
  }

  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'order.created', resourceType: 'order', resourceId: order.id })

  // Notify Kitchen
  const { createNotification } = await import('./notifications.actions')
  await createNotification({
    restaurantId: user.restaurantId,
    type: 'new_order',
    title: 'New Order Created',
    message: `Order #${order.order_number} has been created and sent to the kitchen.`
  })

  revalidatePath('/admin/orders')
  revalidatePath('/admin/tables')
  revalidatePath('/admin/kitchen')
  return { data: order, error: null }
}

export async function getOrders(options?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<Order[]>> {
  const user = await requirePermission(PERMISSIONS.ORDERS_READ)
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)
    .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 50) - 1)

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getOrderWithItems(orderId: string): Promise<ApiResponse<OrderWithDetails>> {
  const user = await requirePermission(PERMISSIONS.ORDERS_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      restaurant_tables(table_number, section),
      customers(full_name, phone)
    `)
    .eq('id', orderId)
    .eq('restaurant_id', user.restaurantId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as OrderWithDetails, error: null }
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.ORDERS_UPDATE)
  const supabase = await createClient()

  const updateData: Record<string, string> = { status }
  if (status === 'completed') updateData.completed_at = new Date().toISOString()
  if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }

  // Deduct inventory if completed
  if (status === 'completed') {
    await deductInventoryForOrder(orderId)
  }

  revalidatePath('/admin/orders')
  revalidatePath('/admin/kitchen')
  return { data: null, error: null }
}

export async function updateOrderItemStatus(
  itemId: string,
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.KITCHEN_UPDATE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('order_items')
    .update({ status })
    .eq('id', itemId)

  if (error) return { data: null, error: error.message }

  if (status === 'ready' || status === 'served') {
    const { createNotification } = await import('./notifications.actions')
    
    // Fetch order number
    const { data: orderItem } = await supabase.from('order_items').select('orders(order_number)').eq('id', itemId).single()
    const orderNumber = (orderItem?.orders as any)?.order_number || 'Unknown'
    
    await createNotification({
      restaurantId: user.restaurantId,
      type: 'room_ready', // We can repurpose this or use a generic one
      title: `Order Item ${status === 'ready' ? 'Ready' : 'Served'}`,
      message: `An item in Order #${orderNumber} is ${status}.`
    })
  }

  revalidatePath('/admin/kitchen')
  revalidatePath('/admin/orders')
  return { data: null, error: null }
}

export async function processPayment(
  orderId: string,
  paymentMethod: string,
  amount: number
): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.POS_ACCESS)
  const supabase = await createClient()

  // Insert payment record
  const { error: paymentError } = await supabase.from('payments').insert({
    order_id: orderId,
    restaurant_id: user.restaurantId,
    processed_by: user.id,
    payment_method: paymentMethod,
    amount,
    currency: 'NPR',
    status: 'completed',
  })

  if (paymentError) return { data: null, error: paymentError.message }

  // Mark order as paid and completed
  const { error: orderError } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('restaurant_id', user.restaurantId)

  if (orderError) return { data: null, error: orderError.message }

  // Free up the table if it was dine_in
  const { data: order } = await supabase.from('orders').select('table_id').eq('id', orderId).single()
  if (order?.table_id) {
    await supabase.from('restaurant_tables').update({ status: 'cleaning' }).eq('id', order.table_id)
  }

  // Deduct inventory
  await deductInventoryForOrder(orderId)

  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: 'payment.processed', resourceType: 'order', resourceId: orderId, newValues: { method: paymentMethod, amount } })
  revalidatePath('/admin/orders')
  revalidatePath('/admin/pos')
  revalidatePath('/admin/tables')
  return { data: null, error: null }
}

export async function getKitchenOrders(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.KITCHEN_ACCESS)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, order_type, created_at, notes,
      restaurant_tables(table_number),
      order_items(id, menu_item_name, quantity, notes, status)
    `)
    .eq('restaurant_id', user.restaurantId)
    .in('status', ['pending', 'confirmed', 'preparing'])
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getActiveOrdersForPOS(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.POS_ACCESS)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, order_type, status, payment_status, total, created_at,
      subtotal, tax_amount, service_charge_amount, discount_amount, customer_name,
      restaurant_tables(table_number),
      order_items(id, menu_item_name, quantity, unit_price, status)
    `)
    .eq('restaurant_id', user.restaurantId)
    .neq('status', 'cancelled')
    .neq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getTables(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.TABLES_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .eq('is_active', true)
    .order('table_number')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateTableStatus(tableId: string, status: string): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('restaurant_tables')
    .update({ status })
    .eq('id', tableId)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/tables')
  return { data: null, error: null }
}
