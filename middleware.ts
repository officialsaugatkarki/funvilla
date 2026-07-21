import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware-client'

// Routes that are always public (no auth required)
const PUBLIC_ROUTES = [
  '/',
  '/menu',
  '/rooms',
  '/pool',
  '/gallery',
  '/about',
  '/contact',
  '/booking',
]

// Auth routes (redirects to dashboard if already logged in)
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
]

// Routes that require the admin role group
const ADMIN_PREFIX = '/admin'

// Role → default landing page after login
const ROLE_LANDING: Record<string, string> = {
  owner:              '/admin/dashboard',
  admin:              '/admin/dashboard',
  manager:            '/admin/dashboard',
  reception:          '/admin/bookings',
  cashier:            '/admin/pos',
  kitchen:            '/admin/kitchen',
  waiter:             '/admin/tables',
  housekeeping:       '/admin/rooms',
  inventory_manager:  '/admin/inventory',
  viewer:             '/admin/dashboard',
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)
  const pathname = request.nextUrl.pathname

  // Refresh session — this keeps the session alive and updates cookies
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some(
    r => pathname === r || pathname.startsWith(r + '/')
  )
  const isAuthRoute = AUTH_ROUTES.some(
    r => pathname === r || pathname.startsWith(r + '/')
  )
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX)
  const isApiRoute = pathname.startsWith('/api/')

  // Static assets and Next.js internals — pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|avif|css|js|woff2?)$/)
  ) {
    return supabaseResponse
  }

  // === CASE 1: Auth route ===
  // Already logged in → redirect to their dashboard
  if (isAuthRoute && user) {
    const roleName = await getUserRole(supabase, user.id)
    const landing = ROLE_LANDING[roleName ?? ''] ?? '/admin/dashboard'
    return NextResponse.redirect(new URL(landing, request.url))
  }

  // === CASE 2: Admin route ===
  // Not logged in → redirect to login
  if (isAdminRoute && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // === CASE 3: API routes ===
  // Protected API routes (non-public) require auth
  if (isApiRoute && !pathname.startsWith('/api/public/') && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // All other routes — pass through with refreshed session cookies
  return supabaseResponse
}

// Lightweight role lookup for middleware (avoids heavy DB calls)
async function getUserRole(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)
    .order('assigned_at', { ascending: true })
    .limit(1)
    .single()

  return (data?.roles as any)?.name ?? null
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static assets)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
