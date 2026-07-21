'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginSchema, type LoginInput } from '@/lib/validations/auth'
import { logActivity } from '@/lib/rbac/guards'

/**
 * Detects transient network errors that may succeed on retry.
 * Node.js caches DNS lookup failures for the process lifetime, so a brief
 * hiccup can poison every subsequent request until the server restarts.
 */
function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  )
}

/**
 * Retries an async operation on transient network errors.
 * Uses exponential backoff: 500ms → 1500ms → 3000ms
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (isTransientNetworkError(err) && attempt < maxAttempts - 1) {
        const delayMs = [500, 1500, 3000][attempt] ?? 3000
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

export async function login(data: LoginInput) {
  const result = LoginSchema.safeParse(data)

  if (!result.success) {
    return { error: 'Invalid input data' }
  }

  const supabase = await createClient()

  // Rate limiting via login_attempts — wrapped in try/catch so it never
  // blocks login if the table is unavailable or the query fails.
  let currentAttempts = 0
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1'

    const { data: attemptData } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('ip_address', ip)
      .single()

    if (attemptData) {
      currentAttempts = attemptData.attempts || 0
      if (attemptData.locked_until && new Date(attemptData.locked_until) > new Date()) {
        return { error: 'Too many failed attempts. Please try again in 5 minutes.' }
      }
    }

    // Perform login with retry for transient network errors
    const { error: signInError, data: authData } = await withRetry(() =>
      supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      })
    )

    if (signInError) {
      const newAttempts = currentAttempts + 1
      const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 5 * 60000).toISOString() : null
      await supabase.from('login_attempts').upsert({
        ip_address: ip,
        attempts: newAttempts,
        locked_until: lockedUntil,
        last_attempt: new Date().toISOString()
      })
      return { error: newAttempts >= 5 ? 'Account locked. Try again in 5 minutes.' : 'Invalid email or password.' }
    }

    // Reset on success
    await supabase.from('login_attempts').delete().eq('ip_address', ip)

    if (authData?.user) {
      try {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('restaurant_id')
          .eq('user_id', authData.user.id)
          .limit(1)
          .single()

        if (userRole) {
          await logActivity({
            restaurantId: userRole.restaurant_id,
            userId: authData.user.id,
            action: 'user.login',
          })
        }
      } catch {
        // Activity logging is non-critical
      }
    }
  } catch (err) {
    // Distinguish between network errors and real auth errors
    if (isTransientNetworkError(err)) {
      return { error: 'Unable to connect to authentication service. Please check your internet connection and try again.' }
    }

    // If rate-limiting fails entirely (e.g., table not yet migrated),
    // fall through to a plain login attempt (with retry)
    try {
      const { error: signInError, data: authData } = await withRetry(() =>
        supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        })
      )

      if (signInError) {
        return { error: 'Invalid email or password.' }
      }

      if (authData?.user) {
        try {
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('restaurant_id')
            .eq('user_id', authData.user.id)
            .limit(1)
            .single()
          if (userRole) {
            await logActivity({
              restaurantId: userRole.restaurant_id,
              userId: authData.user.id,
              action: 'user.login',
            })
          }
        } catch {
          // Non-critical
        }
      }
    } catch (retryErr) {
      if (isTransientNetworkError(retryErr)) {
        return { error: 'Unable to connect to authentication service. Please check your internet connection and try again.' }
      }
      return { error: 'An unexpected error occurred. Please try again.' }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/admin/dashboard')
}

export async function logout() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (userRole) {
        await logActivity({
          restaurantId: userRole.restaurant_id,
          userId: user.id,
          action: 'user.logout',
        })
      }
    }
  } catch {
    // Non-critical
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
