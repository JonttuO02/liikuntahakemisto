import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// Standard createClient (localStorage) — reliable INITIAL_SESSION, no hanging promises.
// @supabase/ssr's createBrowserClient hangs on async init in this Next.js setup.
// All auth checks are client-side so the server not reading localStorage is fine.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BrowserClient = SupabaseClient<any>
type AuthUser = { id: string; email?: string } | null

let _browserClient: BrowserClient | undefined
let _currentUser: AuthUser = null
const _authListeners = new Set<(user: AuthUser) => void>()

function _notifyListeners(user: AuthUser) {
  _currentUser = user
  _authListeners.forEach(cb => cb(user))
}

export function createBrowserSupabase(): BrowserClient {
  if (!_browserClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _browserClient = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    // Single long-lived subscription — drives the auth store for all components.
    _browserClient.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' ||
          event === 'PASSWORD_RECOVERY' || event === 'MFA_CHALLENGE_VERIFIED') return
      const user = session?.user
        ? { id: session.user.id, email: session.user.email }
        : null
      _notifyListeners(user)
    })
  }
  return _browserClient
}

// Subscribe to auth user changes. Immediately fires with the current user.
// Returns an unsubscribe function — safe to call multiple times (idempotent).
export function subscribeToAuthUser(cb: (user: AuthUser) => void): () => void {
  createBrowserSupabase() // ensure singleton + subscription exists
  _authListeners.add(cb)
  cb(_currentUser) // fire immediately with current state
  return () => _authListeners.delete(cb)
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
