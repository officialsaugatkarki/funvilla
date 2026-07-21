'use server'

import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types'

export interface PublicOrderItem {
  menuItemId: string
  menuItemName: string
  menuItemPrice: number
  categoryName?: string | null
  quantity: number
  unitPrice: number
  notes?: string
}

export interface PlaceQrOrderInput {
  restaurantSlug: string
  tableNumber?: string
  customerName?: string
  specialInstructions?: string
  items: PublicOrderItem[]
}

/**
 * placeQrOrder — called by the public menu page (no auth required).
 * Uses the anon key; RLS allows insert for order_type='qr' with status='pending'.
 */
export async function placeQrOrder(
  input: PlaceQrOrderInput
): Promise<ApiResponse<{ orderId: string; orderNumber: string }>> {
  if (!input.items || input.items.length === 0) {
    return { data: null, error: 'Cart is empty' }
  }

  const supabase = await createClient()

  // 1. Resolve restaurant by slug
  const slug = input.restaurantSlug || process.env.NEXT_PUBLIC_RESTAURANT_SLUG || 'khukuri'
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, currency_symbol')
    .eq('slug', slug)
    .single()

  if (restaurantError || !restaurant) {
    return { data: null, error: 'Restaurant not found. Please try again.' }
  }

  // 2. Fetch settings for tax/service charge
  const { data: settings } = await supabase
    .from('settings')
    .select('tax_rate, service_charge_rate')
    .eq('restaurant_id', restaurant.id)
    .single()

  const taxRate = settings?.tax_rate ?? 13
  const serviceChargeRate = settings?.service_charge_rate ?? 0

  // 3. Calculate totals
  const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const serviceAmount = Math.round(subtotal * (serviceChargeRate / 100) * 100) / 100
  const total = subtotal + taxAmount + serviceAmount

  // 4. Resolve table if provided
  let tableId: string | null = null
  if (input.tableNumber) {
    const { data: tableData } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .eq('table_number', input.tableNumber)
      .single()
    tableId = tableData?.id ?? null
  }

  // 5. Insert order (RLS allows anon insert for qr + pending)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: restaurant.id,
      table_id: tableId,
      order_type: 'qr',
      status: 'pending',
      payment_status: 'unpaid',
      subtotal,
      discount_amount: 0,
      tax_amount: taxAmount,
      service_charge_amount: serviceAmount,
      tip_amount: 0,
      total,
      customer_name: input.customerName || null,
      special_instructions: input.specialInstructions || null,
      notes: input.tableNumber ? `Table: ${input.tableNumber}` : null,
      // created_by is NULL for public QR orders — this is intentional
    })
    .select('id, order_number')
    .single()

  if (orderError) {
    console.error('[placeQrOrder] Order insert error:', orderError)
    return { data: null, error: `Failed to place order: ${orderError.message}` }
  }

  // 6. Insert order items
  const itemsToInsert = input.items.map(item => ({
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

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('[placeQrOrder] Items insert error:', itemsError)
    // Order was created but items failed — attempt cleanup
    await supabase.from('orders').delete().eq('id', order.id)
    return { data: null, error: `Failed to save order items: ${itemsError.message}` }
  }

  return {
    data: {
      orderId: order.id,
      orderNumber: order.order_number,
    },
    error: null,
  }
}
