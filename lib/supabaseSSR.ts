import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

let _browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createBrowserSupabase() {
  if (!_browserClient) {
    // Use @supabase/ssr default cookie storage so the session is readable by
    // the server client and middleware. The previous localStorage override broke
    // SSR auth — server components always saw an unauthenticated user.
    // The hanging signInWithPassword promise is handled in AuthModal via the
    // SIGNED_IN event listener, so we do not need to bypass promise resolution.
    _browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _browserClient
}

export function createServerSupabase(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}, // server components cannot set cookies — middleware handles refresh
      },
    }
  )
}
