'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac/guards'
import { PERMISSIONS } from '@/lib/rbac/permissions'
import type { ApiResponse } from '@/lib/types'
import { logActivity } from '@/lib/rbac/guards'

export async function getUsers(): Promise<ApiResponse<any[]>> {
  const sessionUser = await requirePermission(PERMISSIONS.USERS_MANAGE)
  const supabase = await createClient()

  // Step 1: Get all user_roles for this restaurant with role info
  // We intentionally do NOT join profiles here because user_roles.user_id
  // references auth.users, not profiles directly — Supabase schema cache
  // cannot resolve this as a nested relationship.
  const { data: userRoles, error } = await supabase
    .from('user_roles')
    .select(`
      id,
      user_id,
      assigned_at,
      roles (id, name, display_name)
    `)
    .eq('restaurant_id', sessionUser.restaurantId)
    .order('assigned_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  // Step 2: Fetch profiles separately using the user_id list
  const userIds = [...new Set((userRoles || []).map(ur => ur.user_id))]
  let profilesMap: Record<string, any> = {}

  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone')
      .in('id', userIds)

    if (profilesData) {
      profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]))
    }
  }

  // Step 3: Fetch auth users via admin client for email + login info
  const adminClient = createAdminClient()
  const { data: authData } = await adminClient.auth.admin.listUsers()
  const authUsersMap: Record<string, any> = {}
  if (authData?.users) {
    authData.users.forEach(u => { authUsersMap[u.id] = u })
  }

  // Step 4: Merge all data
  const enrichedData = (userRoles || []).map(ur => {
    const authUser = authUsersMap[ur.user_id]
    const profile = profilesMap[ur.user_id]
    return {
      ...ur,
      profiles: profile || null,
      email: authUser?.email,
      last_sign_in_at: authUser?.last_sign_in_at,
      is_suspended: !!authUser?.banned_until,
      email_confirmed_at: authUser?.email_confirmed_at,
    }
  })

  return { data: enrichedData, error: null }
}

export async function createUser(input: {
  email: string
  fullName: string
  phone?: string
  roleId: string
  password?: string
  status?: 'active' | 'suspended'
}): Promise<ApiResponse<any>> {
  const sessionUser = await requirePermission(PERMISSIONS.USERS_MANAGE)

  if (sessionUser.roleName !== 'owner' && sessionUser.roleName !== 'admin') {
    return { data: null, error: 'Only Owner or Admin can create users' }
  }

  const adminClient = createAdminClient()

  // 1. Check if user already exists by email
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === input.email)

  let userId = existingUser?.id

  if (!existingUser) {
    // 2. Create auth user with provided password or a strong random one
    const password = input.password && input.password.length >= 8
      ? input.password
      : generateSecurePassword()

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName }
    })
    if (createErr) return { data: null, error: createErr.message }
    if (!newUser?.user) return { data: null, error: 'User creation failed' }

    userId = newUser.user.id
  }

  // 3. Upsert profile
  if (userId) {
    await adminClient.from('profiles').upsert({
      id: userId,
      full_name: input.fullName,
      phone: input.phone || null,
    })
  }

  // 4. Assign role to restaurant
  if (userId) {
    const { error: roleErr } = await adminClient.from('user_roles').insert({
      user_id: userId,
      role_id: input.roleId,
      restaurant_id: sessionUser.restaurantId,
      assigned_by: sessionUser.id
    })

    if (roleErr) {
      // Conflict = user already has this role in this restaurant
      if (roleErr.code === '23505') {
        return { data: null, error: 'User already has a role in this restaurant.' }
      }
      return { data: null, error: roleErr.message }
    }

    // 5. Apply suspension if requested
    if (input.status === 'suspended') {
      await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: '876000h'
      })
    }

    await logActivity({
      restaurantId: sessionUser.restaurantId,
      userId: sessionUser.id,
      action: 'user.created',
      resourceType: 'user',
      resourceId: userId,
      newValues: { email: input.email, role_id: input.roleId }
    })
  }

  revalidatePath('/admin/users')
  return { data: { userId }, error: null }
}

export async function updateUserRole(userId: string, newRoleId: string): Promise<ApiResponse<null>> {
  const sessionUser = await requirePermission(PERMISSIONS.USERS_MANAGE)
  const adminClient = createAdminClient()

  if (userId === sessionUser.id) {
    return { data: null, error: 'You cannot modify your own role' }
  }

  const { error } = await adminClient
    .from('user_roles')
    .update({ role_id: newRoleId })
    .eq('user_id', userId)
    .eq('restaurant_id', sessionUser.restaurantId)

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: sessionUser.restaurantId,
    userId: sessionUser.id,
    action: 'user.role_updated',
    resourceType: 'user',
    resourceId: userId,
    newValues: { role_id: newRoleId }
  })

  revalidatePath('/admin/users')
  return { data: null, error: null }
}

export async function toggleUserSuspension(userId: string, suspend: boolean): Promise<ApiResponse<null>> {
  const sessionUser = await requirePermission(PERMISSIONS.USERS_MANAGE)

  if (userId === sessionUser.id) {
    return { data: null, error: 'You cannot suspend yourself' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? '876000h' : 'none'
  })

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: sessionUser.restaurantId,
    userId: sessionUser.id,
    action: suspend ? 'user.suspended' : 'user.reactivated',
    resourceType: 'user',
    resourceId: userId
  })

  revalidatePath('/admin/users')
  return { data: null, error: null }
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<ApiResponse<null>> {
  const sessionUser = await requirePermission(PERMISSIONS.USERS_MANAGE)

  if (newPassword.length < 8) {
    return { data: null, error: 'Password must be at least 8 characters' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: sessionUser.restaurantId,
    userId: sessionUser.id,
    action: 'user.password_reset',
    resourceType: 'user',
    resourceId: userId,
  })

  return { data: null, error: null }
}

export async function removeUser(userId: string): Promise<ApiResponse<null>> {
  const sessionUser = await requirePermission(PERMISSIONS.USERS_MANAGE)

  if (userId === sessionUser.id) {
    return { data: null, error: 'You cannot remove yourself' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', sessionUser.restaurantId)

  if (error) return { data: null, error: error.message }

  await logActivity({
    restaurantId: sessionUser.restaurantId,
    userId: sessionUser.id,
    action: 'user.removed_from_restaurant',
    resourceType: 'user',
    resourceId: userId
  })

  revalidatePath('/admin/users')
  return { data: null, error: null }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
