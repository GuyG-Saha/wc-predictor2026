import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log('[middleware] path:', request.nextUrl.pathname)
  console.log('[middleware] auth user:', user?.id ?? null, '| error:', authError?.message ?? null)

  if (!user) {
    console.log('[middleware] no user — redirecting to /')
    return NextResponse.redirect(new URL('/', request.url))
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('[middleware] profile:', profile, '| error:', profileError?.message ?? null)

  if (profileError || profile?.role !== 'admin') {
    console.log('[middleware] not admin — redirecting to /. role:', profile?.role ?? 'null')
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
