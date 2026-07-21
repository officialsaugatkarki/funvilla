import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase server client that reads/writes cookies via next/headers.
 * Call this inside Server Components, Server Actions, and Route Handlers.
 * DO NOT call this in Client Components.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can only be called from Server Actions or Route Handlers.
            // When called from Server Components, Next.js will throw — this is expected.
          }
        },
      },
    }
  )
}
