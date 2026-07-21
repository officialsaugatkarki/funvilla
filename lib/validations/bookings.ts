import { z } from 'zod'

export const RoomBookingSchema = z.object({
  guest_name: z.string().min(2, 'Guest name must be at least 2 characters').max(200),
  guest_email: z.string().email('Invalid email').optional().or(z.literal('')),
  guest_phone: z.string().min(7, 'Phone number is required').max(20),
  guest_count: z.number().int().min(1, 'At least 1 guest required'),
  room_type_id: z.string().uuid('Please select a room type'),
  check_in_date: z.string().min(1, 'Check-in date is required'),
  check_out_date: z.string().min(1, 'Check-out date is required'),
  special_requests: z.string().max(1000).optional(),
}).refine(data => {
  const checkIn = new Date(data.check_in_date)
  const checkOut = new Date(data.check_out_date)
  return checkOut > checkIn
}, { message: 'Check-out must be after check-in', path: ['check_out_date'] })

export type RoomBookingInput = z.infer<typeof RoomBookingSchema>

export const BookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']),
  room_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  cancel_reason: z.string().max(500).optional(),
})
export type BookingStatusInput = z.infer<typeof BookingStatusSchema>
