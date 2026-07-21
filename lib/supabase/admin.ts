import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase Admin client using the service role key.
 * Bypasses RLS — use with extreme caution.
 * ONLY call this from server-side code (Server Actions, API Routes).
 * NEVER expose this client or its key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'Ensure these are set in .env.local and are NOT prefixed with NEXT_PUBLIC_ for the service key.'
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
