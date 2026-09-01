'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import { RoomBookingSchema, type RoomBookingInput } from '@/lib/validations/bookings'
import type { ApiResponse, RoomBooking, Room, RoomType } from '@/lib/types'
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// ROOM TYPES
// ─────────────────────────────────────────────────────────────────────────────
export async function getRoomTypes(): Promise<ApiResponse<RoomType[]>> {
  const supabase = await createClient()
  // Public read — no auth required
  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS
// ─────────────────────────────────────────────────────────────────────────────
export async function getRooms(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.ROOMS_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_types(name, base_price, max_occupancy, amenities)')
    .eq('restaurant_id', user.restaurantId)
    .eq('is_active', true)
    .order('room_number')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateRoomStatus(
  roomId: string,
  status: string,
  housekeepingStatus?: string
): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.ROOMS_MANAGE)
  const supabase = await createClient()

  const updateData: Record<string, string> = { status }
  if (housekeepingStatus) updateData.housekeeping_status = housekeepingStatus

  const { error } = await supabase
    .from('rooms')
    .update(updateData)
    .eq('id', roomId)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/rooms')
  return { data: null, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
export async function getBookings(options?: { status?: string }): Promise<ApiResponse<RoomBooking[]>> {
  const user = await requirePermission(PERMISSIONS.BOOKINGS_READ)
  const supabase = await createClient()

  let query = supabase
    .from('room_bookings')
    .select('*, rooms(room_number), room_types(name)')
    .eq('restaurant_id', user.restaurantId)
    .order('check_in_date', { ascending: true })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as unknown as RoomBooking[], error: null }
}

export async function createBooking(input: RoomBookingInput): Promise<ApiResponse<RoomBooking>> {
  const result = RoomBookingSchema.safeParse(input)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()

  // Get restaurant id from room type
  const { data: roomType } = await supabase
    .from('room_types')
    .select('restaurant_id, base_price')
    .eq('id', result.data.room_type_id)
    .single()

  if (!roomType) return { data: null, error: 'Room type not found' }

  const checkIn = new Date(result.data.check_in_date)
  const checkOut = new Date(result.data.check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const subtotal = roomType.base_price * nights
  const taxAmount = 0 // Tax: 0% per business configuration

  const { data, error } = await supabase
    .from('room_bookings')
    .insert({
      restaurant_id: roomType.restaurant_id,
      room_type_id: result.data.room_type_id,
      guest_name: result.data.guest_name,
      guest_email: result.data.guest_email || null,
      guest_phone: result.data.guest_phone,
      guest_count: result.data.guest_count,
      check_in_date: result.data.check_in_date,
      check_out_date: result.data.check_out_date,
      nights,
      room_rate: roomType.base_price,
      subtotal,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
      deposit_amount: 0,
      status: 'pending',
      payment_status: 'unpaid',
      source: 'online',
      special_requests: result.data.special_requests || null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/bookings')
  return { data: data as unknown as RoomBooking, error: null }
}

export async function updateBookingStatus(
  bookingId: string,
  status: string,
  roomId?: string
): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.BOOKINGS_UPDATE)
  const supabase = await createClient()

  const updateData: Record<string, string | null> = { status }
  if (roomId) updateData.room_id = roomId
  if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString()
  if (status === 'checked_in') updateData.actual_check_in = new Date().toISOString()
  if (status === 'checked_out') updateData.actual_check_out = new Date().toISOString()

  const { error } = await supabase
    .from('room_bookings')
    .update(updateData)
    .eq('id', bookingId)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }

  // Update room status on check-in/out
  if (roomId && status === 'checked_in') {
    await supabase.from('rooms').update({ status: 'occupied' }).eq('id', roomId)
  }
  if (roomId && status === 'checked_out') {
    await supabase.from('rooms').update({ status: 'cleaning', housekeeping_status: 'dirty' }).eq('id', roomId)
  }

  await logActivity({ restaurantId: user.restaurantId, userId: user.id, action: `booking.${status}`, resourceType: 'booking', resourceId: bookingId })
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/rooms')
  return { data: null, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// POOL
// ─────────────────────────────────────────────────────────────────────────────
export async function getPoolTickets(date?: string): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.POOL_ACCESS)
  const supabase = await createClient()

  let query = supabase
    .from('pool_tickets')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .order('created_at', { ascending: false })

  if (date) query = query.eq('valid_date', date)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createPoolTicket(input: {
  ticketType: string
  visitorName?: string
  visitorPhone?: string
  visitorAddress?: string
  visitorGender?: string
  visitorCount: number
  paymentMethod: string
}): Promise<ApiResponse<any>> {
  const user = await requirePermission(PERMISSIONS.POOL_TICKETS)
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('pool_adult_price, pool_child_price, pool_family_price')
    .eq('restaurant_id', user.restaurantId)
    .single()

  const priceMap: Record<string, number> = {
    adult: 200, // Hardcoded for Swimming as requested (adult: 200)
    child: 150, // Hardcoded for Swimming as requested (kid: 150)
    family: settings?.pool_family_price ?? 500,
    member: 0,
    staff: 0,
  }

  const price = (priceMap[input.ticketType] ?? 200) * input.visitorCount

  const { data, error } = await supabase
    .from('pool_tickets')
    .insert({
      restaurant_id: user.restaurantId,
      ticket_type: input.ticketType,
      visitor_name: input.visitorName || null,
      visitor_phone: input.visitorPhone || null,
      visitor_address: input.visitorAddress || null,
      visitor_gender: input.visitorGender || null,
      visitor_count: input.visitorCount,
      price,
      payment_method: input.paymentMethod,
      payment_status: 'paid',
      valid_date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toISOString(),
      sold_by: user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/pool')
  return { data, error: null }
}


// ─────────────────────────────────────────────────────────────────────────────
// SWIMMING
// ─────────────────────────────────────────────────────────────────────────────
export async function getSwimmingTickets(date?: string): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.SWIMMING_ACCESS)
  const supabase = await createClient()

  let query = supabase
    .from('swimming_tickets')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .order('created_at', { ascending: false })

  if (date) query = query.eq('valid_date', date)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createSwimmingTicket(input: {
  ticketType: string
  visitorName?: string
  visitorPhone?: string
  visitorAddress?: string
  visitorGender?: string
  visitorCount: number
  paymentMethod: string
}): Promise<ApiResponse<any>> {
  const user = await requirePermission(PERMISSIONS.SWIMMING_TICKETS)
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('pool_adult_price, pool_child_price, pool_family_price')
    .eq('restaurant_id', user.restaurantId)
    .single()

  // Reusing pool prices for swimming for now, or you can add swimming_adult_price in settings
  const priceMap: Record<string, number> = {
    adult: 200, // Hardcoded for Swimming as requested (adult: 200)
    child: 150, // Hardcoded for Swimming as requested (kid: 150)
    family: settings?.pool_family_price ?? 500,
    member: 0,
    staff: 0,
  }

  const price = (priceMap[input.ticketType] ?? 200) * input.visitorCount

  const { data, error } = await supabase
    .from('swimming_tickets')
    .insert({
      restaurant_id: user.restaurantId,
      ticket_type: input.ticketType,
      visitor_name: input.visitorName || null,
      visitor_phone: input.visitorPhone || null,
      visitor_address: input.visitorAddress || null,
      visitor_gender: input.visitorGender || null,
      visitor_count: input.visitorCount,
      price,
      payment_method: input.paymentMethod,
      payment_status: 'paid',
      valid_date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toISOString(),
      sold_by: user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/swimming')
  return { data, error: null }
}
