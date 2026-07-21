import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Permission } from './permissions'
import type { RoleName, SessionUser } from '@/lib/types'
import { redirect } from 'next/navigation'

// ============================================================================
// GET CURRENT SESSION USER (server-side)
// ============================================================================
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's role and permissions for their restaurant
  const { data: userRole } = await supabase
    .from('user_roles')
    .select(`
      restaurant_id,
      roles (
        name,
        role_permissions (
          permissions ( name )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('assigned_at', { ascending: true })
    .limit(1)
    .single()

  if (!userRole) return null

  const role = userRole.roles as any
  const permissions: string[] = role?.role_permissions?.map(
    (rp: any) => rp.permissions?.name
  ).filter(Boolean) ?? []

  return {
    id: user.id,
    email: user.email ?? '',
    restaurantId: userRole.restaurant_id,
    roleName: role?.name as RoleName,
    permissions,
  }
}

// ============================================================================
// SERVER-SIDE PERMISSION GUARD
// Call at the top of Server Components / Server Actions to enforce access.
// ============================================================================
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const sessionUser = await getSessionUser()

  if (!sessionUser) {
    redirect('/auth/login')
  }

  if (!sessionUser.permissions.includes(permission)) {
    // Return a 403-style response rather than leaking info
    redirect('/admin/unauthorized')
  }

  return sessionUser
}

// ============================================================================
// SERVER-SIDE AUTH GUARD (just requires login, no specific permission)
// ============================================================================
export async function requireAuth(): Promise<SessionUser> {
  const sessionUser = await getSessionUser()

  if (!sessionUser) {
    redirect('/auth/login')
  }

  return sessionUser
}

// ============================================================================
// CHECK PERMISSION (returns boolean, does not redirect)
// Use when you want to conditionally render UI, not hard-block access.
// ============================================================================
export async function checkPermission(permission: Permission): Promise<boolean> {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return false
  return sessionUser.permissions.includes(permission)
}

// ============================================================================
// GET ALL USER PERMISSIONS
// ============================================================================
export async function getUserPermissions(): Promise<string[]> {
  const sessionUser = await getSessionUser()
  return sessionUser?.permissions ?? []
}

// ============================================================================
// ADMIN GUARD: Assign role to user (service-role, bypasses RLS)
// ============================================================================
export async function assignRole(
  userId: string,
  roleName: RoleName,
  restaurantId: string,
  assignedBy: string
) {
  const admin = createAdminClient()

  const { data: role } = await admin
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single()

  if (!role) throw new Error(`Role '${roleName}' not found`)

  const { error } = await admin.from('user_roles').upsert({
    user_id: userId,
    role_id: role.id,
    restaurant_id: restaurantId,
    assigned_by: assignedBy,
  }, { onConflict: 'user_id,role_id,restaurant_id' })

  if (error) throw error
}

// ============================================================================
// LOG ACTIVITY (server-side, fire-and-forget safe)
// ============================================================================
export async function logActivity(params: {
  restaurantId: string
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}) {
  try {
    const supabase = await createClient()
    await supabase.from('activity_logs').insert({
      restaurant_id: params.restaurantId,
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      old_values: params.oldValues,
      new_values: params.newValues,
    })
  } catch {
    // Activity logging should never block the main operation
    console.error('[ActivityLog] Failed to log:', params.action)
  }
}
