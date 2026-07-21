'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import type { ApiResponse } from '@/lib/types'
import { z } from 'zod'

const RoomTypeSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  basePrice: z.number().min(0),
  maxOccupancy: z.number().int().min(1),
  amenities: z.array(z.string()).default([]),
})

export async function getRoomTypes(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.ROOMS_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .order('name')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createRoomType(input: z.infer<typeof RoomTypeSchema>): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.ROOMS_MANAGE)
  const result = RoomTypeSchema.safeParse(input)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()

  const { error } = await supabase.from('room_types').insert({
    restaurant_id: user.restaurantId,
    name: result.data.name,
    description: result.data.description,
    base_price: result.data.basePrice,
    max_occupancy: result.data.maxOccupancy,
    amenities: result.data.amenities,
  })

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: 'Created room type',
    resourceType: 'room_type',
    newValues: result.data
  })

  revalidatePath('/admin/rooms')
  return { data: null, error: null }
}

export async function getRooms(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.ROOMS_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rooms')
    .select(`*, room_types(name)`)
    .eq('restaurant_id', user.restaurantId)
    .order('room_number')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createRoom(input: { roomTypeId: string, roomNumber: string, floor: string }): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.ROOMS_MANAGE)
  const supabase = await createClient()

  const { error } = await supabase.from('rooms').insert({
    restaurant_id: user.restaurantId,
    room_type_id: input.roomTypeId,
    room_number: input.roomNumber,
    floor: input.floor,
    status: 'available',
  })

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: 'Created room',
    resourceType: 'room',
    newValues: input
  })

  revalidatePath('/admin/rooms')
  return { data: null, error: null }
}

export async function updateRoomStatus(roomId: string, status: string): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.ROOMS_MANAGE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('rooms')
    .update({ status })
    .eq('id', roomId)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }

  revalidatePath('/admin/rooms')
  return { data: null, error: null }
}
