import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// Module-level singleton for the business browser client.
// Uses the sb-biz-* cookie namespace, completely separate from the consumer sb-* namespace.
// Do NOT attach onAuthStateChange listeners — @supabase/ssr createBrowserClient handles
// token refresh internally via its own cookie-based mechanism.
let _bizBrowserClient: ReturnType<typeof createBrowserClient> | undefined

export function createBusinessBrowserClient(): ReturnType<typeof createBrowserClient> {
  if (!_bizBrowserClient) {
    _bizBrowserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { name: 'sb-biz' },
      }
    )
  }
  return _bizBrowserClient
}

export function createBusinessServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-biz' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}, // server components cannot set cookies — middleware handles refresh
      },
    }
  )
}
