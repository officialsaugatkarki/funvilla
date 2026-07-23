'use server'

import { createClient } from '@/lib/supabase/server'

export async function createNotification({
  restaurantId,
  type,
  title,
  message,
}: {
  restaurantId: string
  type: string
  title: string
  message: string
}) {
  const supabase = await createClient()

  // We do not require permission to create notifications since this can happen from public QR orders
  const { error } = await supabase.from('notifications').insert({
    restaurant_id: restaurantId,
    type,
    title,
    message,
    is_read: false
  })

  if (error) {
    console.error('Failed to create notification', error.message)
  }
}
