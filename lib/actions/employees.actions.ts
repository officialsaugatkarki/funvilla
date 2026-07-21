'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import { logActivity } from '@/lib/rbac/guards'
import type { ApiResponse } from '@/lib/types'
import { z } from 'zod'

const StaffSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  department: z.string().min(2),
  position: z.string().min(2),
  salary: z.number().min(0),
  hireDate: z.string(),
  shiftStart: z.string().optional().nullable(),
  shiftEnd: z.string().optional().nullable(),
})

export type StaffInput = z.infer<typeof StaffSchema>

export async function createStaff(input: StaffInput): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_MANAGE)
  const result = StaffSchema.safeParse(input)
  if (!result.success) return { data: null, error: result.error.errors[0].message }

  const supabase = await createClient()

  const { error } = await supabase.from('staff').insert({
    restaurant_id: user.restaurantId,
    user_id: result.data.userId,
    department: result.data.department,
    position: result.data.position,
    salary: result.data.salary,
    hire_date: result.data.hireDate,
    shift_start: result.data.shiftStart,
    shift_end: result.data.shiftEnd,
    is_active: true
  })

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: 'Created employee record',
    resourceType: 'staff',
    newValues: result.data
  })

  revalidatePath('/admin/employees')
  return { data: null, error: null }
}

export async function deactivateStaff(id: string): Promise<ApiResponse<null>> {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_MANAGE)
  const supabase = await createClient()

  const { error } = await supabase
    .from('staff')
    .update({ is_active: false })
    .eq('id', id)
    .eq('restaurant_id', user.restaurantId)

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: 'Deactivated employee record',
    resourceType: 'staff',
    resourceId: id
  })

  revalidatePath('/admin/employees')
  return { data: null, error: null }
}
