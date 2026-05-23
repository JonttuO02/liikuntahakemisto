---
phase: 09-auth-and-favorites
fixed_at: 2026-05-23T12:30:00Z
review_path: .planning/phases/09-auth-and-favorites/09-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 09: Code Review Fix Report

**Fixed at:** 2026-05-23T12:30:00Z
**Source review:** .planning/phases/09-auth-and-favorites/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (4 Critical + 6 Warning)
- Fixed: 10
- Skipped: 0

## Fixed Issues

### CR-01: Prompt injection via unsanitized favorite venue names

**Files modified:** `app/api/saasuositus/route.ts`
**Commit:** 1f7eb90
**Applied fix:** In the POST handler, replaced the bare `body.suosikit.slice(0, 10)` assignment with a pipeline that (1) filters to strings only, (2) strips any character outside Unicode letters, digits, whitespace, hyphens, dots, and commas via `/[^\p{L}\p{N}\s\-,.]/gu`, and (3) truncates each element to 80 characters. This closes the jailbreak vector where arbitrary POST bodies could inject instructions into the Anthropic prompt.

---

### CR-02: Infinite re-fetch loop in Etusivu AI widget effect

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** f4f51d0
**Applied fix:** Added a `useMemo` that derives `suosikitSizeAndIds` as a sorted, comma-joined string from `suosikitIds`. Changed the AI-fetch `useEffect` dependency from `[suosikitIds]` (a Set that creates a new reference on every render) to `[suosikitSizeAndIds]` (a string that is stable by value). This eliminates the spurious second AI request on first paint for authenticated users and prevents any future loop from Set reference churn. Requires human verification for logic correctness.

---

### CR-03: Race condition corrupts optimistic favorite state under concurrent taps

**Files modified:** `app/components/LiikuntapaikatLista.tsx`, `app/components/Etusivu.tsx`
**Commit:** 2549d04
**Applied fix:** Added `const inFlight = useRef<Set<number>>(new Set())` to both components. The `toggleSuosikki` function now returns early if the id is already in `inFlight`, adds it before the network call, and removes it in a `finally` block after the call completes. The early-return path for unauthenticated users also clears the ref before redirecting to auth. Added `useRef` to the React import in both files.

---

### CR-04: Profile page uses anon-key Supabase client for DB read

**Files modified:** `app/paikat/[id]/page.tsx`, `lib/supabase.ts`, `lib/supabaseAdmin.server.ts` (new file), `app/api/admin/sync-paikat/route.ts`, `app/api/hae-paikat/route.ts`
**Commit:** a86a361
**Applied fix:** Replaced `import { supabase } from '@/lib/supabase'` in the profile page with `import { cookies } from 'next/headers'` and `import { createServerSupabase } from '@/lib/supabaseSSR'`. The function now constructs `createServerSupabase(cookies())` locally, giving it the authenticated server context. Moved `supabaseAdmin` from `lib/supabase.ts` to a new `lib/supabaseAdmin.server.ts` file (server-only, never importable client-side) and updated the two API routes (`sync-paikat` and `hae-paikat`) to import from the new location. `lib/supabase.ts` now only exports the anon browser client.

---

### WR-01: `onAuthStateChange` fires with `INITIAL_SESSION`, double-fetching favorites on mount

**Files modified:** `app/components/HeartButton.tsx`, `app/components/LiikuntapaikatLista.tsx`, `app/components/Etusivu.tsx`
**Commit:** 3374cfc
**Applied fix:** Removed the imperative `init()` / `fetchFavorites()` calls from all three components. Each component now relies solely on `onAuthStateChange` which fires `INITIAL_SESSION` synchronously on mount, providing the initial session without a redundant second DB call. Also fixed WR-04 in the same commit (see below).

---

### WR-02: `handleSubmit` does not check for session after signup

**Files modified:** `app/components/AuthModal.tsx`
**Commit:** c9dec3e
**Applied fix:** Changed the `signUp` call to destructure `{ data, error: err }`. After verifying no error, an additional guard checks `if (!data.session)` — if true (email confirmation flow), it shows a Finnish info message ("Tarkista sähköpostisi ja vahvista tili.") and returns early without calling `onSuccess`. This prevents the modal from closing and the pending favorite from being silently dropped when email confirmation is enabled.

---

### WR-03: `onSuccess` callback in HeartButton does not insert the favorite row

**Files modified:** `app/components/HeartButton.tsx`
**Commit:** b66f916
**Applied fix:** Replaced the optimistic-only `onSuccess` handler (`setIsSuosikki(true); setAuthModalOpen(false)`) with an async handler that closes the modal, calls `supabase.auth.getUser()`, and if a user is present, calls `supabase.from('suosikit').insert(...)`. Only if the insert succeeds does it set `isSuosikki(true)`. This mirrors the insert pattern already used in `LiikuntapaikatLista`.

---

### WR-04: Missing `user_id` filter in Etusivu favorites query

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** 3374cfc (combined with WR-01)
**Applied fix:** Added `.eq('user_id', u.id)` to the `suosikit` select query inside `onAuthStateChange` in Etusivu, matching the pattern already used in `LiikuntapaikatLista`. This prevents the query from returning all rows if RLS is ever weakened, and makes the explicit intent clear regardless of RLS state.

---

### WR-05: Middleware does not write refreshed session cookies back to the request

**Files modified:** `middleware.ts`
**Commit:** d4bad5e
**Applied fix:** Applied the canonical Supabase Next.js double-set pattern in `setAll`: first mutate `request.cookies` for each cookie, then re-create `response = NextResponse.next({ request })` so the updated request is forwarded, then set each cookie on the new response. Server Components rendered in the same edge pipeline will now read the freshly refreshed session token instead of the stale pre-refresh value.

---

### WR-06: Google OAuth `redirectTo` uses `window.location.origin` without error handling

**Files modified:** `app/components/AuthModal.tsx`
**Commit:** 61631ae
**Applied fix:** Destructured `const { error }` from `signInWithOAuth` and added `if (error) setError('Google-kirjautuminen epäonnistui. Yritä uudelleen.')` to surface OAuth failures to the user. Also changed `redirectTo` from `window.location.origin` to `` `${window.location.origin}/auth/callback` `` to match the standard Supabase OAuth callback URL pattern.

---

_Fixed: 2026-05-23T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
