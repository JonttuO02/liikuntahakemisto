import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isBusiness = pathname.startsWith('/business')

  let response = NextResponse.next({ request })

  if (isBusiness) {
    // Business branch: refresh sb-biz-* session only
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { name: 'sb-biz' },
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser() // refreshes sb-biz-* session

    // Business auth guard: redirect unauthenticated users to /business/kirjaudu
    // Excluded paths: /business/rekisteroidy and /business/kirjaudu (public entry points)
    const isPublicBusinessPath =
      pathname.startsWith('/business/rekisteroidy') ||
      pathname.startsWith('/business/kirjaudu')

    if (!isPublicBusinessPath && !user) {
      return NextResponse.redirect(new URL('/business/kirjaudu', request.url))
    }
  } else {
    // Consumer branch: refresh sb-* session only (default namespace, no cookieOptions)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    await supabase.auth.getUser() // refreshes sb-* session
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
