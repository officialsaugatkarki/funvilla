'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import type { ApiResponse } from '@/lib/types'
import { z } from 'zod'

const SupplierSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export type SupplierInput = z.infer<typeof SupplierSchema>

export async function getSuppliers(): Promise<ApiResponse<any[]>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_READ)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .order('name')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createSupplier(input: SupplierInput): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE)
  const result = SupplierSchema.safeParse(input)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()

  const { error } = await supabase.from('suppliers').insert({
    restaurant_id: user.restaurantId,
    name: result.data.name,
    contact_person: result.data.contactPerson,
    email: result.data.email,
    phone: result.data.phone,
    address: result.data.address
  })

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: 'Created supplier',
    resourceType: 'supplier',
    newValues: result.data
  })

  revalidatePath('/admin/suppliers')
  return { data: null, error: null }
}
