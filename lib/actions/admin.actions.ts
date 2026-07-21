'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import type { ApiResponse, Customer } from '@/lib/types'
import { z } from 'zod'

const CustomerSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).default([]),
})

export async function getCustomers(search?: string): Promise<ApiResponse<Customer[]>> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_READ)
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .eq('is_active', true)
    .order('full_name')

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getCustomer(id: string): Promise<ApiResponse<Customer>> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createCustomer(formData: unknown): Promise<ApiResponse<Customer>> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_CREATE)
  const result = CustomerSchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...result.data, restaurant_id: user.restaurantId })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/customers')
  return { data, error: null }
}

export async function updateCustomer(id: string, formData: unknown): Promise<ApiResponse<Customer>> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_UPDATE)
  const result = CustomerSchema.safeParse(formData)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .update(result.data)
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/customers')
  return { data, error: null }
}

export async function getCustomerHistory(customerId: string): Promise<ApiResponse<any>> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_READ)
  const supabase = await createClient()

  const [ordersRes, bookingsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, total, status, created_at, order_type')
      .eq('customer_id', customerId)
      .eq('restaurant_id', user.restaurantId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('room_bookings')
      .select('id, booking_number, total, status, check_in_date, check_out_date')
      .eq('customer_id', customerId)
      .eq('restaurant_id', user.restaurantId)
      .order('check_in_date', { ascending: false })
      .limit(10),
  ])

  return {
    data: {
      orders: ordersRes.data ?? [],
      bookings: bookingsRes.data ?? [],
    },
    error: ordersRes.error?.message ?? bookingsRes.error?.message ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────
export async function getDashboardMetrics(restaurantId: string): Promise<ApiResponse<any>> {
  const user = await requirePermission(PERMISSIONS.REPORTS_READ)
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [ordersToday, revenueToday, activeBookings, lowStock] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status', { count: 'exact' })
      .eq('restaurant_id', user.restaurantId)
      .gte('created_at', `${today}T00:00:00`)
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('total')
      .eq('restaurant_id', user.restaurantId)
      .eq('payment_status', 'paid')
      .gte('created_at', `${today}T00:00:00`),
    supabase
      .from('room_bookings')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', user.restaurantId)
      .eq('status', 'confirmed'),
    supabase
      .from('inventory')
      .select('id, quantity, min_quantity', { count: 'exact' })
      .eq('restaurant_id', user.restaurantId)
      .eq('is_active', true),
  ])

  const revenue = (revenueToday.data ?? []).reduce((sum: number, o: any) => sum + o.total, 0)
  const pendingOrders = (ordersToday.data ?? []).filter((o: any) => o.status === 'confirmed' || o.status === 'preparing' || o.status === 'pending').length
  const lowStockCount = (lowStock.data ?? []).filter((i: any) => i.quantity <= i.min_quantity).length

  return {
    data: {
      todayOrders: ordersToday.count ?? 0,
      todayRevenue: revenue,
      activeBookings: activeBookings.count ?? 0,
      pendingOrders,
      lowStockCount,
    },
    error: null,
  }
}

export async function getRevenueReport(period: 'week' | 'month' | 'year'): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.REPORTS_READ)
  const supabase = await createClient()

  const now = new Date()
  let fromDate: string

  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    fromDate = d.toISOString()
  } else if (period === 'month') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    fromDate = d.toISOString()
  } else {
    const d = new Date(now)
    d.setFullYear(d.getFullYear() - 1)
    fromDate = d.toISOString()
  }

  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at, order_type, status, payment_status')
    .eq('restaurant_id', user.restaurantId)
    .eq('payment_status', 'paid')
    .gte('created_at', fromDate)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
export async function getSettings(): Promise<ApiResponse<any>> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateSettings(formData: Record<string, unknown>): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('settings')
    .update(formData)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/settings')
  return { data: null, error: null }
}

export async function getRestaurant(): Promise<ApiResponse<any>> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', user.restaurantId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────────────────────────
export async function getStaff(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff')
    .select(`
      *,
      profiles(full_name, avatar_url, phone),
      user_roles(roles(name, display_name))
    `)
    .eq('restaurant_id', user.restaurantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
export async function submitContactMessage(input: {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}): Promise<ApiResponse<null>> {
  const supabase = await createClient()

  // Find the restaurant by slug
  const restaurantSlug = process.env.NEXT_PUBLIC_RESTAURANT_SLUG ?? 'khukuri'
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) return { data: null, error: 'Restaurant not found' }

  const { error } = await supabase.from('contact_messages').insert({
    restaurant_id: restaurant.id,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    subject: input.subject || null,
    message: input.message,
    status: 'unread',
  })

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}
