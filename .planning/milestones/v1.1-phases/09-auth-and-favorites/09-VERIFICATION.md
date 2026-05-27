---
phase: 09-auth-and-favorites
verified: 2026-05-23T08:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Sign up with email/password, then navigate away and back — verify favorites persist across page refresh"
    expected: "Heart-filled venues remain filled after full page reload and on a different browser/device (Supabase as source of truth)"
    why_human: "Cannot verify cross-device persistence or actual Supabase write without a live session; static analysis confirms the INSERT/SELECT code paths exist and are wired"
  - test: "Tap a heart while signed out on the list page — verify auth modal opens, sign in, verify venue is auto-saved"
    expected: "AuthModal opens, after sign-in the pending favorite (stored in pendingFavoriteId) is saved via toggleSuosikki(id)"
    why_human: "The auth modal open/pending flow is wired in code, but the complete sign-in -> auto-save round-trip requires live browser interaction"
  - test: "Save 1–3 favorites while signed in, navigate to home map view, observe the AI widget text"
    expected: "AI widget text changes to reference a sport type or venue name from the saved favorites list (personalized vs generic)"
    why_human: "POST /api/saasuositus call and prompt injection code exists and is wired, but the AI-generated content quality requires human eye to confirm personalization is reflected"
  - test: "Open the NavBar hamburger menu when signed in — verify email is displayed and sign-out works"
    expected: "Truncated email shown, LogOut icon visible; after clicking sign-out the user state clears and NavBar reverts to User icon"
    why_human: "Server-side auth prop drilling requires a live request to verify the server reads the session cookie and passes userEmail correctly"
  - test: "On the home page (map view), open the right-toolbar (MoreHorizontal) when signed out — tap the User icon"
    expected: "AuthModal opens with sign-in/sign-up toggle; Google OAuth button present; email+password form present"
    why_human: "Toolbar auth wiring is code-verified but UX flow (z-index stacking, modal appearance over map) requires visual confirmation"
  - test: "Visit /suosikit while signed out"
    expected: "Page shows 'Suosikit vaativat kirjautumisen' heading and a 'Kirjaudu sisään' CTA button"
    why_human: "Server component auth check is code-verified; need to confirm the rendered page content is correct in production"
  - test: "Google OAuth — tap 'Jatka Googlella' in the auth modal"
    expected: "Redirect to Google login; after approval, user is signed in and returned to the app"
    why_human: "Google OAuth requires external service configuration (Cloud Console + Supabase redirect URLs) that cannot be verified statically"
---

# Phase 9: Auth & Favorites — Verification Report

**Phase Goal:** Users can create accounts, save favorites across devices, and receive personalized AI recommendations.
**Verified:** 2026-05-23T08:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | User can sign up and sign in with email/password or Google OAuth without leaving the app | VERIFIED | `AuthModal.tsx` (278 lines): full glass modal with email/password and Google OAuth, AnimatePresence animations, mode toggle, error display; wired into NavBar (hamburger dropdown) and Etusivu right toolbar |
| SC-2 | A signed-in user can heart/un-heart any venue; favorites persist when switching devices or browsers | VERIFIED | Heart in PaikkaKortti (absolute top-right, prop-gated), Etusivu valittu sheet (line 696-703), HeartButton.tsx (profile page); all surfaces do optimistic Supabase INSERT/DELETE with revert-on-error; onAuthStateChange subscription re-fetches on sign-in |
| SC-3 | The AI weather recommendation references the user's saved favorites when they are signed in | VERIFIED | POST handler in `route.ts` lines 73-99 accepts `suosikit: string[]`, clamps to 10, appends `Käyttäjän suosikit: ...` to prompt; Etusivu effect at lines 227-254 sends POST with suosikkiNimet when suosikitIds.size > 0, GET otherwise |
| SC-4 | Signed-out users can browse the full directory without being prompted or gated | VERIFIED | PaikkaKortti renders heart only when `onToggleSuosikki` prop provided — prop is always supplied (not conditionally hidden for signed-out users); heart is always visible, unfilled; tapping while signed out opens modal (D-06 pattern confirmed) |

**Score: 4/4 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `middleware.ts` | Session cookie refresh on every non-static request | VERIFIED | Exists, uses `createServerClient` with `getAll`/`setAll` cookie handlers, calls `supabase.auth.getUser()` to refresh session |
| `lib/supabaseSSR.ts` | Exports `createBrowserSupabase` and `createServerSupabase` | VERIFIED | Exact exports confirmed; `createBrowserSupabase()` uses `createBrowserClient`; `createServerSupabase(cookieStore)` uses per-request `createServerClient` |
| `lib/types.ts` | `Suosikki` type | VERIFIED | Lines 21-26: `{ id: number, user_id: string, paikka_id: number, created_at: string }` |
| `supabase/migrations/20260523_suosikit.sql` | `suosikit` table with RLS policies | VERIFIED | Table DDL with `user_id uuid FK auth.users`, `paikka_id bigint FK liikuntapaikat`, UNIQUE constraint; SELECT/INSERT (WITH CHECK)/DELETE RLS policies |
| `app/components/AuthModal.tsx` | Glass modal with sign-in/sign-up, Google OAuth, email/password form | VERIFIED | 278 lines; glass panel, AnimatePresence backdrop+panel, mode toggle, Google OAuth via `signInWithOAuth`, email/password via `signInWithPassword`/`signUp`, Finnish error mapping, loading states, Escape key handler |
| `app/layout.tsx` | Async RSC fetching `getUser()` and passing `userEmail` to NavBar | VERIFIED | `async function RootLayout`, calls `createServerSupabase(cookieStore)`, calls `supabase.auth.getUser()`, passes `userEmail={user?.email ?? null}` to NavBar |
| `app/components/NavBar.tsx` | Accepts `userEmail` prop; shows auth state in hamburger dropdown | VERIFIED | `NavBarProps { userEmail: string | null }`, conditional render: signed-in shows email + LogOut, signed-out shows User icon; AuthModal mounted outside sticky header (fragment wrapper) |
| `app/components/PaikkaKortti.tsx` | Optional heart button, top-right absolute | VERIFIED | Props `isSuosikki?: boolean`, `onToggleSuosikki?: (id: number) => void`; button rendered only when `onToggleSuosikki` defined; `absolute top-2 right-2 z-10`; fill state via `cn()` |
| `app/components/LiikuntapaikatLista.tsx` | Favorites state, toggleSuosikki, AuthModal mount | VERIFIED | `suosikitIds: Set<number>` state, `pendingFavoriteId`, `authModalOpen`; `toggleSuosikki` with optimistic update + Supabase INSERT/DELETE + revert; `onAuthStateChange` subscription; AuthModal at bottom of JSX |
| `app/components/Etusivu.tsx` | Favorites state, heart in valittu sheet, User/LogOut in right toolbar, AuthModal | VERIFIED | `suosikitIds`, `supabaseUser`, `authModalOpen`, `pendingFavoriteId` states; heart in valittu sheet at lines 696-703; User/LogOut at lines 517-539; AuthModal at lines 631-639 |
| `app/components/HeartButton.tsx` | Standalone heart client component for profile page | VERIFIED | `'use client'`, `isSuosikki` + `authModalOpen` state, `toggle()` with `getUser()` live check, optimistic INSERT/DELETE, `onAuthStateChange` subscription, AuthModal mount |
| `app/paikat/[id]/page.tsx` | HeartButton in hero flex row | VERIFIED | `import HeartButton from '@/app/components/HeartButton'`; lines 51-55: `<div className="flex items-start justify-between gap-3 mt-3">` with h1 and `<HeartButton paikkaId={paikka.id} />` |
| `app/suosikit/page.tsx` | Async server component calling `getUser()` | VERIFIED | `async function SuosikitPage`, `createServerSupabase(cookieStore)`, `getUser()`, renders `<SuosikitClient userEmail={user?.email ?? null} />` |
| `app/suosikit/SuosikitClient.tsx` | Auth-aware UI: signed-out prompt, signed-in empty state | VERIFIED | `userEmail` null: "Suosikit vaativat kirjautumisen" heading + "Kirjaudu sisään" CTA button + AuthModal; userEmail present: empty-state copy "Et ole vielä tallentanut suosikkeja..." |
| `app/api/saasuositus/route.ts` | GET (unchanged) + POST with favorites personalization | VERIFIED | GET handler unchanged; POST handler lines 73-99 parses `suosikit: string[]`, clamps to 10, appends to prompt; shared `fetchWeather()` helper eliminates duplication |
| `package.json` | `@supabase/ssr` dependency | VERIFIED | `"@supabase/ssr": "^0.10.3"` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/layout.tsx` | `NavBar` | `userEmail` prop | WIRED | `<NavBar userEmail={user?.email ?? null} />` after `supabase.auth.getUser()` |
| `NavBar.tsx` | `AuthModal` | `open={authModalOpen}` | WIRED | Mounted outside sticky header div, `<AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />` |
| `LiikuntapaikatLista.tsx` | Supabase `suosikit` table | `createBrowserSupabase().from('suosikit')` | WIRED | `fetchFavorites()` SELECT; `toggleSuosikki()` INSERT/DELETE; `onAuthStateChange` subscription |
| `LiikuntapaikatLista.tsx` | `PaikkaKortti` | `isSuosikki` + `onToggleSuosikki` props | WIRED | Lines 277-285: each card receives `isSuosikki={suosikitIds.has(p.id)}` and `onToggleSuosikki={toggleSuosikki}` |
| `Etusivu.tsx` | Supabase `suosikit` table | `createBrowserSupabase().from('suosikit')` | WIRED | `init()` useEffect; `toggleSuosikki()` INSERT/DELETE; `onAuthStateChange` subscription with cleanup |
| `Etusivu.tsx` | `/api/saasuositus` POST | `fetch('/api/saasuositus', { method: 'POST', body: JSON.stringify({ suosikit: suosikkiNimet }) })` | WIRED | Lines 240-244; conditional on `suosikkiNimet.length > 0` |
| `HeartButton.tsx` | Supabase `suosikit` table | `createBrowserSupabase().from('suosikit')` | WIRED | `init()` SELECT for initial state; `toggle()` INSERT/DELETE with revert |
| `app/suosikit/page.tsx` | `SuosikitClient` | `userEmail` prop | WIRED | Server component passes `user?.email ?? null` to client component |
| `middleware.ts` | Supabase session | `createServerClient` + `supabase.auth.getUser()` | WIRED | Refreshes session cookie on every non-static request per config matcher |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `LiikuntapaikatLista.tsx` | `suosikitIds: Set<number>` | `supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)` | Yes — DB query with user_id filter | FLOWING |
| `Etusivu.tsx` | `suosikitIds: Set<number>` | `supabase.from('suosikit').select('paikka_id')` (RLS filters to current user) | Yes — DB query; RLS SELECT policy restricts to `auth.uid() = user_id` | FLOWING |
| `HeartButton.tsx` | `isSuosikki: boolean` | `supabase.from('suosikit').select('id').eq('user_id', user.id).eq('paikka_id', paikkaId).maybeSingle()` | Yes — DB query for specific row | FLOWING |
| `app/suosikit/page.tsx` | `user` | `createServerSupabase(cookieStore).auth.getUser()` | Yes — validated server-side auth check | FLOWING |
| `app/api/saasuositus/route.ts` POST | `suosikit: string[]` | Request body from Etusivu | Yes — venue names from client's suosikitIds mapped to paikat | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| GET /api/saasuositus responds | Not runnable without live server | — | SKIP |
| POST /api/saasuositus responds | Not runnable without live server | — | SKIP |
| middleware.ts exports correctly | Static analysis: exports `middleware` function + `config` with matcher | Matches Supabase SSR Next.js pattern exactly | PASS |
| supabaseSSR.ts exports both helpers | Static analysis: `export function createBrowserSupabase()` + `export function createServerSupabase(cookieStore)` | Both confirmed present | PASS |
| PaikkaKortti heart conditional render | `onToggleSuosikki && (...)` at line 63 | Heart only renders when prop provided | PASS |
| AI POST conditional | `suosikkiNimet.length > 0` guard at line 240 | Falls back to GET when no favorites | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 09-02 | User can sign in with email/password or Google account | SATISFIED | AuthModal with `signInWithPassword`, `signUp`, `signInWithOAuth({ provider: 'google' })`; wired to NavBar and Etusivu toolbar |
| AUTH-02 | 09-03 | Signed-in user can save/remove favorites that persist across devices | SATISFIED | Heart buttons on 3 surfaces; Supabase INSERT/DELETE; `onAuthStateChange` re-fetches on sign-in; migration SQL with RLS INSERT WITH CHECK |
| AUTH-03 | 09-04 | AI recommendation takes saved favorites into account | SATISFIED | POST handler appends `Käyttäjän suosikit: ${suosikit.join(', ')}` to Haiku prompt; Etusivu uses POST when `suosikitIds.size > 0` |

All three Phase 9 requirements are covered. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No TBD/FIXME/XXX markers found | — | — |
| None | — | No unreferenced debt markers | — | — |

Placeholder-text matches in search were HTML input `placeholder=` attributes (form fields in AuthModal and LiikuntapaikatLista) — these are legitimate UI patterns, not implementation stubs.

The `app/suosikit/SuosikitClient.tsx` signed-in empty state ("Et ole vielä tallentanut suosikkeja...") is intentional per PLAN 09-03 T-03-6 and REQUIREMENTS.md ("Suosikkipaikat-sivu kirjautuneelle käyttäjälle (v1.2)"). The actual favorites list page is a deferred v1.2 feature.

---

### Deferred Items

Items not yet met but explicitly scheduled in a later milestone phase:

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Favorites list page (`/suosikit`) showing saved venues for signed-in users | v1.2 (Future) | REQUIREMENTS.md: "Suosikkipaikat-sivu kirjautuneelle käyttäjälle (v1.2)" — explicitly out of scope for Phase 9 |
| 2 | Password reset flow | v1.2 (Future) | PLAN.md Deferred section: "Password reset flow — not in AUTH-01/02/03 scope; v1.2" |

---

### Human Verification Required

The automated checks pass all 4 roadmap success criteria. The following items require a live browser session to confirm end-to-end behavior:

#### 1. Favorites Persistence Across Devices

**Test:** Sign up with email/password on one browser, heart 2-3 venues, open the same account in a different browser or incognito tab.
**Expected:** The same venues appear as saved (filled hearts) without any additional interaction.
**Why human:** Cross-device persistence requires Supabase to be live with the migration SQL applied and a real auth session. Static code analysis confirms the INSERT/SELECT/RLS paths are correct, but cannot verify the database is provisioned.

#### 2. Auth Modal → Auto-Save Pending Favorite Flow

**Test:** On the list page (`/?nakyma=lista`), tap the heart on any venue while signed out. Sign in using email/password in the modal that opens.
**Expected:** After successful sign-in, the venue that triggered the modal is automatically saved as a favorite (heart fills).
**Why human:** The `pendingFavoriteId` → `onSuccess` callback chain is code-verified (LiikuntapaikatLista lines 316-323), but the complete round-trip requires live interaction.

#### 3. AI Personalization in Widget

**Test:** Sign in, save 2-3 favorites, navigate to the home map view (`/`), observe the AI widget text in the bottom sheet.
**Expected:** The AI text references a sport or venue name that relates to your saved favorites (different from the generic recommendation shown when signed out).
**Why human:** The POST prompt injection is code-verified, but AI-generated content quality and relevance requires human judgement. The session cache key is `saasuositus-YYYY-MM-DD-N` where N is the favorites count — confirm the widget updates after saving a favorite.

#### 4. NavBar Auth State (Non-Home Pages)

**Test:** Sign in on the home page, navigate to `/paikat/[id]` (any venue detail page). Open the NavBar hamburger menu.
**Expected:** Truncated email address shown, LogOut icon visible. Clicking LogOut clears the session and reverts to the User icon.
**Why human:** Server-side `getUser()` in layout.tsx passes the email to NavBar, but the cookie refresh cycle requires a real browser request. Also verifies `router.refresh()` after sign-out correctly triggers an RSC re-render.

#### 5. Home Page Right Toolbar Auth State

**Test:** On the home page map view, tap the MoreHorizontal icon (top-right toolbar). When signed out, verify the User icon is present. Tap it.
**Expected:** AuthModal slides up over the map (z-[80] > z-64 toolbar). Both email/password form and Google OAuth button visible.
**Why human:** Z-index layering over the map requires visual confirmation. The code uses `z-[80]` for the modal, map is `z-50`, toolbar is `z-64` — stacking context is correct in theory but should be confirmed visually.

#### 6. Suosikit Page — Signed-Out State

**Test:** Visit `/suosikit` in an incognito tab (unauthenticated).
**Expected:** Page shows "Suosikit vaativat kirjautumisen" heading, descriptive paragraph, and "Kirjaudu sisään" button that opens AuthModal.
**Why human:** Server-side `getUser()` in `app/suosikit/page.tsx` must correctly return null for unauthenticated requests. Requires a live server request.

#### 7. Google OAuth (Conditional on External Setup)

**Test:** Tap "Jatka Googlella" in the auth modal.
**Expected:** Redirect to Google login page, then back to the app with the user signed in.
**Why human:** Requires `{SUPABASE_PROJECT_URL}/auth/v1/callback` added to Google Cloud Console and the app origin in Supabase Auth redirect URLs. The code calls `signInWithOAuth({ provider: 'google' })` correctly, but the external configuration cannot be verified statically. Email/password auth works independently.

---

### Gaps Summary

No code gaps found. All 4 roadmap success criteria are verified in the codebase with substantive, wired, and data-flowing implementations. The `human_needed` status reflects that 7 behavioral items require a live browser session to confirm end-to-end, as is expected for a complete auth system integration.

The only known caveat is the Supabase migration SQL (`supabase/migrations/20260523_suosikit.sql`) is a local file — it must be applied manually in the Supabase Dashboard SQL Editor before favorites will function at runtime. This is documented in PLAN 09-01 T-01-5 and 09-03 as a required manual gate.

---

_Verified: 2026-05-23T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
