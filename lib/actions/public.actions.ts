'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}

async function getRestaurantId(supabase: ReturnType<typeof getAdminClient>) {
  const slug = process.env.NEXT_PUBLIC_RESTAURANT_SLUG || 'khukuri'
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .single()
  return restaurant?.id ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROOM BOOKING (no auth required — saves via service role)
// ─────────────────────────────────────────────────────────────────────────────
export async function createPublicRoomBooking(input: {
  roomName: string
  roomTypeId: string
  guestName: string
  guestPhone: string
  guestCount: number
  checkInDate: string
  checkOutDate: string
}) {
  const supabase = getAdminClient()
  const restaurantId = await getRestaurantId(supabase)
  if (!restaurantId) return { data: null, error: 'Restaurant not found' }

  const checkIn = new Date(input.checkInDate)
  const checkOut = new Date(input.checkOutDate)
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

  // Fetch base price from room type
  const { data: roomType } = await supabase
    .from('room_types')
    .select('base_price')
    .eq('id', input.roomTypeId)
    .single()

  const roomRate = roomType?.base_price ?? 1200
  const subtotal = roomRate * nights
  const taxAmount = Math.round(subtotal * 0.13 * 100) / 100
  const total = subtotal + taxAmount

  const { data, error } = await supabase
    .from('room_bookings')
    .insert({
      restaurant_id: restaurantId,
      room_type_id: input.roomTypeId,
      guest_name: input.guestName,
      guest_phone: input.guestPhone,
      guest_count: input.guestCount,
      check_in_date: input.checkInDate,
      check_out_date: input.checkOutDate,
      nights,
      room_rate: roomRate,
      subtotal,
      tax_amount: taxAmount,
      total,
      deposit_amount: 0,
      status: 'pending',
      payment_status: 'unpaid',
      source: 'online',
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SWIMMING TRAINING PACKAGE (no auth required)
// ─────────────────────────────────────────────────────────────────────────────
export async function createPublicTrainingPackage(input: {
  packageName: string
  visitorName: string
  phone: string
}) {
  const supabase = getAdminClient()
  const restaurantId = await getRestaurantId(supabase)
  if (!restaurantId) return { data: null, error: 'Restaurant not found' }

  const price = input.packageName === '15 Days Package' ? 4000 : 8000

  const { data, error } = await supabase
    .from('pool_tickets')
    .insert({
      restaurant_id: restaurantId,
      ticket_type: 'member',
      visitor_name: `${input.visitorName} (${input.phone})`,
      visitor_count: 1,
      price,
      payment_method: 'cash',
      payment_status: 'unpaid',
      valid_date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toISOString(),
      notes: input.packageName,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
