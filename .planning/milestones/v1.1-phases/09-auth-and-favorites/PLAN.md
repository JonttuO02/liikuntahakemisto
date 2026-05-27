# Phase 9: Auth & Favorites — PLAN.md

**Phase goal:** Users can create accounts, save favorites across devices, and receive personalized AI recommendations.
**Requirements:** AUTH-01, AUTH-02, AUTH-03
**Context:** `09-CONTEXT.md` (decisions D-01–D-13, L-01–L-06), `09-UI-SPEC.md` (approved)
**Depends on:** Phase 6 (LEGAL-01 live ✅)

---

## Plans

| Plan | Title | Files touched | Risk |
|------|-------|---------------|------|
| 09-01 | Foundation — SSR package, middleware, DB schema | `middleware.ts`, `lib/supabaseSSR.ts`, `lib/types.ts`, migration SQL | Low |
| 09-02 | AuthModal + server auth wiring | `app/components/AuthModal.tsx`, `app/layout.tsx`, `app/components/NavBar.tsx` | Medium |
| 09-03 | Heart buttons + favorites engine | `PaikkaKortti.tsx`, `LiikuntapaikatLista.tsx`, `Etusivu.tsx`, `app/paikat/[id]/page.tsx`, `app/components/HeartButton.tsx`, `app/suosikit/page.tsx`, `app/suosikit/SuosikitClient.tsx` | High |
| 09-04 | AI personalization | `app/api/saasuositus/route.ts`, `Etusivu.tsx` | Low |

---

## Plan 09-01: Foundation — SSR package, middleware, DB schema

**Goal:** The auth infrastructure is in place — session cookies are refreshed, SSR client helpers exist, the favorites table is ready in the database.

**Why first:** L-01 (middleware is first deliverable), L-02 (@supabase/ssr required for all auth), L-04 (RLS must be configured before any INSERT). All later plans depend on these.

### Tasks

#### T-01-1: Install @supabase/ssr
```
npm install @supabase/ssr
```
Verify it appears in `package.json` dependencies. No other packages needed for Phase 9 (all others already installed).

#### T-01-2: Create `middleware.ts` (project root)
New file. Refreshes Supabase session cookie on every non-static request so the server always has an up-to-date session.

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser() // refreshes session, updates cookie

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

#### T-01-3: Create `lib/supabaseSSR.ts`
New file. Exports two factory functions used throughout Phase 9:
- `createBrowserSupabase()` — for `'use client'` components (uses cookies from browser)
- `createServerSupabase(cookieStore)` — for server components and Route Handlers

```ts
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
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
```

#### T-01-4: Add `Suosikki` type to `lib/types.ts`
Append to existing file:

```ts
export type Suosikki = {
  id: number
  user_id: string
  paikka_id: number
  created_at: string
}
```

#### T-01-5: Create Supabase migration SQL
Create file `supabase/migrations/20260523_suosikit.sql` (or document as a manual migration to run in Supabase Dashboard SQL editor):

```sql
-- Create suosikit (favorites) table
CREATE TABLE IF NOT EXISTS suosikit (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id   bigint NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, paikka_id)
);

-- Enable Row Level Security
ALTER TABLE suosikit ENABLE ROW LEVEL SECURITY;

-- Users can read only their own favorites
CREATE POLICY "Users can read own suosikit"
  ON suosikit FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert only their own favorites (WITH CHECK — not USING)
CREATE POLICY "Users can insert own suosikit"
  ON suosikit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own favorites
CREATE POLICY "Users can delete own suosikit"
  ON suosikit FOR DELETE
  USING (auth.uid() = user_id);
```

**Manual step:** Run this SQL in the Supabase Dashboard → SQL Editor, OR via Supabase CLI (`supabase db push`). This must be done before plan 09-03.

### Acceptance criteria
- [ ] `@supabase/ssr` is in `package.json`
- [ ] `middleware.ts` exists at project root, matches the Supabase SSR pattern for Next.js
- [ ] `lib/supabaseSSR.ts` exports `createBrowserSupabase` and `createServerSupabase`
- [ ] `Suosikki` type is in `lib/types.ts`
- [ ] `suosikit` table SQL is ready to be run (or has been run) in Supabase
- [ ] `npm run build` passes (TypeScript compiles, no import errors)

---

## Plan 09-02: AuthModal + server auth wiring

**Goal:** Users can sign in and sign up via a glass modal; NavBar shows auth state (email + sign-out when signed in, 'Kirjaudu' when signed out); auth state is server-sourced on each request.

**Depends on:** 09-01 (requires `@supabase/ssr` and `lib/supabaseSSR.ts`)

### Tasks

#### T-02-1: Create `app/components/AuthModal.tsx`
New client component. Full glass modal with:
- Backdrop scrim `bg-[rgba(0,0,0,0.40)]` (AnimatePresence)
- Panel: `.glass rounded-2xl p-6 w-full max-w-sm mx-4`, slides up on mobile / centered on sm+
- `mode: 'signin' | 'signup'` state with toggle link
- Google OAuth button (glass-btn, Google G SVG inline, "Jatka Googlella")
- "TAI" separator (text-[10px] font-bold uppercase tracking-widest)
- Email + password inputs (border-[rgba(0,0,0,0.12)] rounded-lg h-10 text-sm)
- Error display: single line text-sm text-red-600, AnimatePresence fade
- Submit button: `bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 w-full`
- Loading state: `opacity-60 pointer-events-none`, label changes to "Kirjaudutaan..." / "Luodaan tiliä..."
- Close: backdrop click, X button (glass-btn w-7 h-7 top-right absolute), Escape key
- Props:
  ```ts
  interface AuthModalProps {
    open: boolean
    onClose: () => void
    pendingPaikkaId?: number | null // if set, onSuccess fires with this ID
    onSuccess?: (paikkaId: number | null) => void
  }
  ```
- On successful sign-in/sign-up: call `onSuccess(pendingPaikkaId ?? null)`, close modal, call `router.refresh()`
- Uses `createBrowserSupabase()` from `lib/supabaseSSR.ts`
- Finnish copy throughout (see UI-SPEC copywriting contract)
- z-index: `z-[80]` (above all toolbars z-64, valittu sheet z-70)

Animation spec (from UI-SPEC):
```tsx
// Backdrop
initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}

// Panel
initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}

// Mode toggle (form fields)
AnimatePresence mode="wait", key={mode}
initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
```

Google OAuth implementation:
```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
})
```

**Note on Google OAuth setup:** The Google Cloud Console must have `{SUPABASE_PROJECT_URL}/auth/v1/callback` as an authorized redirect URI, and Supabase Auth → URL Configuration must have the app's origin as a redirect URL. Document these as a manual setup step — do not block execution on them.

#### T-02-2: Update `app/layout.tsx` to fetch auth state
Change layout from pure RSC that ignores auth to one that reads auth state and passes it to NavBar.

```ts
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabaseSSR'

// Inside RootLayout (async):
const cookieStore = cookies()
const supabase = createServerSupabase(cookieStore)
const { data: { user } } = await supabase.auth.getUser()
```

Pass `userEmail={user?.email ?? null}` to `<NavBar>`.

`RootLayout` must become `async` to use `cookies()` and `await`. This is standard Next.js 14 pattern for RSC.

#### T-02-3: Update `app/components/NavBar.tsx` to accept auth state
Current: `'use client'`, no auth awareness.
Change:
- Add prop `userEmail: string | null` (serializable — no full User object)
- Add `authModalOpen` state (boolean)
- Import `AuthModal` and mount it when `authModalOpen` is true
- Import `LogOut`, `User` from lucide-react (already installed)
- Import `createBrowserSupabase` from `lib/supabaseSSR`
- Import `useRouter` from `next/navigation`

Hamburger dropdown — **signed out** (userEmail is null):
Add a User icon button before the Search link:
```tsx
<button
  onClick={() => { setOpen(false); setAuthModalOpen(true) }}
  aria-label="Kirjaudu"
  className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
>
  <User className="w-4 h-4" />
</button>
```

Hamburger dropdown — **signed in** (userEmail is not null):
Replace User button with email truncated + LogOut button:
```tsx
<span className="text-sm font-bold text-[#111111] max-w-[120px] truncate">{userEmail}</span>
<button
  onClick={handleSignOut}
  aria-label="Kirjaudu ulos"
  className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
>
  <LogOut className="w-4 h-4" />
</button>
```

`handleSignOut`: calls `createBrowserSupabase().auth.signOut()` then `router.refresh()`.

Keep the existing Heart link to `/suosikit` in both states.

Mount `<AuthModal>` at the end of the NavBar return (outside the sticky header div, but inside the component root):
```tsx
<AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
```

### Acceptance criteria
- [ ] `AuthModal.tsx` renders glass modal with sign-in/sign-up toggle, Google OAuth button, email/password form, error display
- [ ] Auth modal opens and closes with AnimatePresence animation
- [ ] Email/password sign-in calls `supabase.auth.signInWithPassword()`, shows loading state, handles errors
- [ ] Email/password sign-up calls `supabase.auth.signUp()`, shows loading state
- [ ] Google OAuth button calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- [ ] Modal closes on backdrop click, X button, and Escape key
- [ ] `layout.tsx` is async, calls `getUser()`, passes `userEmail` prop to NavBar
- [ ] NavBar shows User icon → opens auth modal when signed out
- [ ] NavBar shows email (truncated) + LogOut icon when signed in
- [ ] Sign-out calls `supabase.auth.signOut()` then `router.refresh()`
- [ ] `npm run build` passes

---

## Plan 09-03: Heart buttons + favorites engine

**Goal:** Heart buttons appear on all three surfaces (list cards, map bottom sheet, profile page); favorites are persisted to Supabase and synced; unauthenticated users are prompted to sign in when they tap a heart.

**Depends on:** 09-01 (suosikit table must exist), 09-02 (AuthModal component available). The suosikit table SQL from 09-01 MUST be run in Supabase before testing this plan.

### Tasks

#### T-03-1: Update `app/components/PaikkaKortti.tsx` — add heart button
Add two optional props:
```ts
isSuosikki?: boolean
onToggleSuosikki?: (id: number) => void
```

Add heart button as absolute overlay on the card root:
- Wrap the existing `motion.div` root with `position: relative` (add `relative` class)
- Render heart button only when `onToggleSuosikki` is defined:
```tsx
{onToggleSuosikki && (
  <motion.button
    whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
    onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSuosikki(paikka.id) }}
    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full glass-btn flex items-center justify-center"
    aria-label={isSuosikki ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
  >
    <Heart className={cn('w-4 h-4', isSuosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
  </motion.button>
)}
```
Import `Heart` from lucide-react, `cn` from `@/lib/utils`.

#### T-03-2: Update `app/components/LiikuntapaikatLista.tsx` — favorites state
Add favorites state management:
- `suosikitIds: Set<number>` state (initializes empty)
- `authModalOpen: boolean` state
- `pendingFavoriteId: number | null` state
- On mount (useEffect): if user is signed in, fetch favorites from Supabase
  ```ts
  const supabase = createBrowserSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)
    if (data) setSuosikitIds(new Set(data.map(s => s.paikka_id)))
  }
  ```
- Subscribe to `supabase.auth.onAuthStateChange` — re-fetch favorites when user signs in
- `toggleSuosikki(id: number)` function:
  - If signed out: set `pendingFavoriteId = id`, open `authModalOpen = true`
  - If signed in: optimistic update (add/remove from Set), then Supabase INSERT or DELETE; revert on error
- Pass `isSuosikki={suosikitIds.has(p.id)}` and `onToggleSuosikki={toggleSuosikki}` to each `<PaikkaKortti>`
- Mount `<AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} pendingPaikkaId={pendingFavoriteId} onSuccess={id => { if (id) toggleSuosikki(id); setAuthModalOpen(false) }} />`
- Import `AuthModal` from `./AuthModal`, `createBrowserSupabase` from `@/lib/supabaseSSR`

#### T-03-3: Update `app/components/Etusivu.tsx` — heart in valittu sheet + favorites fetch + auth toolbar
Three changes to Etusivu:

**A. Favorites state:**
Add state:
- `suosikitIds: Set<number>` (favorites)
- `supabaseUser: import('@supabase/supabase-js').User | null` (auth state)
- `authModalOpen: boolean`
- `pendingFavoriteId: number | null`

On mount (useEffect):
```ts
const supabase = createBrowserSupabase()
// 1. Get initial auth state
const { data: { user } } = await supabase.auth.getUser()
setSupabaseUser(user)
if (user) {
  const { data } = await supabase.from('suosikit').select('paikka_id')
  if (data) setSuosikitIds(new Set(data.map(s => s.paikka_id)))
}
// 2. Subscribe to auth changes
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  const u = session?.user ?? null
  setSupabaseUser(u)
  if (u) {
    const { data } = await supabase.from('suosikit').select('paikka_id')
    if (data) setSuosikitIds(new Set(data.map(s => s.paikka_id)))
  } else {
    setSuosikitIds(new Set())
  }
})
return () => subscription.unsubscribe()
```

`toggleSuosikki(id: number)`:
- If no user: set `pendingFavoriteId = id`, `authModalOpen = true`
- If user: optimistic update Set, then Supabase INSERT/DELETE, revert on error

**B. Heart in valittu bottom sheet:**
In the valittu sheet, find line `<h2 className="mt-2 font-serif text-xl font-bold...">` and wrap name + heart in a flex row:
```tsx
<div className="mt-2 flex items-start justify-between gap-2">
  <h2 className="font-serif text-xl font-bold text-[#111111] leading-snug flex-1">{valittu.nimi}</h2>
  <motion.button
    whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
    onClick={() => toggleSuosikki(valittu.id)}
    className="shrink-0 w-8 h-8 rounded-full glass-btn flex items-center justify-center"
    aria-label={suosikitIds.has(valittu.id) ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
  >
    <Heart className={cn('w-4 h-4', suosikitIds.has(valittu.id) ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
  </motion.button>
</div>
```
Import `Heart` (already imported in Etusivu), `cn` from `@/lib/utils`.

**C. Auth state in right toolbar:**
In the right toolbar expanded content (currently: Search link + Heart link), add a User/LogOut button as the third item:
```tsx
{supabaseUser ? (
  <button
    onClick={() => { createBrowserSupabase().auth.signOut().then(() => { setSupabaseUser(null); setSuosikitIds(new Set()); router.refresh() }); closeOverlays() }}
    className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
    aria-label="Kirjaudu ulos"
  >
    <LogOut className="w-3.5 h-3.5" />
  </button>
) : (
  <button
    onClick={() => { setAuthModalOpen(true); closeOverlays() }}
    className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
    aria-label="Kirjaudu"
  >
    <User className="w-3.5 h-3.5" />
  </button>
)}
```
Import `LogOut`, `User` from lucide-react. Import `useRouter` from `next/navigation` (needed for `router.refresh()` in the sign-out handler above).

Mount AuthModal at the end of Etusivu return:
```tsx
<AuthModal
  open={authModalOpen}
  onClose={() => setAuthModalOpen(false)}
  pendingPaikkaId={pendingFavoriteId}
  onSuccess={id => {
    if (id) toggleSuosikki(id)
    setAuthModalOpen(false)
  }}
/>
```

#### T-03-4: Create `app/components/HeartButton.tsx` — client heart for profile page
New `'use client'` component. Handles favorites state for the profile page independently.

```ts
interface HeartButtonProps {
  paikkaId: number
}
```

State: `isSuosikki: boolean`, `supabaseUser: User | null`, `authModalOpen: boolean`

On mount:
- Fetch user + check if this `paikkaId` is already in suosikit
- Subscribe to auth changes

`toggle()`:
- If no user: open AuthModal (pendingPaikkaId = paikkaId)
- If user: optimistic toggle, Supabase INSERT/DELETE, revert on error

Renders:
```tsx
<>
  <motion.button
    whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
    onClick={toggle}
    className="glass-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0"
    aria-label={isSuosikki ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
  >
    <Heart className={cn('w-5 h-5', isSuosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
  </motion.button>
  <AuthModal
    open={authModalOpen}
    onClose={() => setAuthModalOpen(false)}
    pendingPaikkaId={paikkaId}
    onSuccess={() => { setIsSuosikki(true); setAuthModalOpen(false) }}
  />
</>
```

#### T-03-5: Update `app/paikat/[id]/page.tsx` — add HeartButton to hero
In the hero section, wrap the venue name `h1` and HeartButton in a flex row.

Find the block starting at `<div className="mt-6">` and modify the name section:
```tsx
<div className="mt-6">
  <span ...>sport badge</span>
  <div className="flex items-start justify-between gap-3 mt-3">
    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#111111] leading-tight tracking-tight flex-1">
      {paikka.nimi}
    </h1>
    <HeartButton paikkaId={paikka.id} />
  </div>
  {/* address row unchanged */}
</div>
```
Import `HeartButton` from `@/app/components/HeartButton`.

#### T-03-6: Update `app/suosikit/page.tsx` — signed-out state
Replace the "Suosikkitoiminto on tulossa pian" stub with a server component that checks auth state and renders appropriately.

Since this page needs auth state but shows only a prompt-to-sign-in for now (no actual favorites list — v1.2), make it a server component with an auth check:

```ts
// app/suosikit/page.tsx (server component)
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabaseSSR'
import SuosikitClient from './SuosikitClient'

export default async function SuosikitPage() {
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  return <SuosikitClient userEmail={user?.email ?? null} />
}
```

Create `app/suosikit/SuosikitClient.tsx` (`'use client'`):
- If `userEmail` is null: show "Kirjaudu ensin" UI per UI-SPEC (heading, body, CTA button that opens AuthModal)
- If `userEmail` is not null: show "Et ole vielä tallentanut suosikkeja. Selaa hakemistoa ja lisää sydämellä." empty state (favorites list page is v1.2)

**Note:** The `/suosikit` client that receives `userEmail` as a prop needs AuthModal for the "Kirjaudu sisään" CTA. Mount it internally.

### Acceptance criteria
- [ ] PaikkaKortti shows an absolute heart button when `onToggleSuosikki` prop is provided; heart is hidden when prop is absent
- [ ] Unfilled heart is `text-[rgba(17,17,17,0.35)]`; filled heart is `fill-[#111111] text-[#111111]`
- [ ] Heart tap on list card (signed out) opens AuthModal; after sign-in, the previously-tapped venue is saved
- [ ] Heart tap on list card (signed in) toggles favorite optimistically; Supabase INSERT/DELETE fires in background
- [ ] Etusivu valittu sheet shows heart in name row; works as above
- [ ] Etusivu right toolbar shows User icon (signed out) → opens AuthModal, or LogOut icon (signed in) → signs out
- [ ] Profile page shows heart button in hero; works as above
- [ ] `/suosikit` (signed out): shows "Suosikit vaativat kirjautumisen" heading + "Kirjaudu sisään" CTA
- [ ] `/suosikit` (signed in): shows empty state copy
- [ ] Favorites persist on page refresh and across devices (Supabase as source of truth)
- [ ] Signed-out user can open `/?nakyma=lista`, browse venues, see unfilled heart buttons, and open `/paikat/[id]` — no sign-in prompt or gating appears (SC-4)
- [ ] `npm run build` passes

---

## Plan 09-04: AI personalization

**Goal:** The AI weather recommendation references the user's saved favorites when they are signed in (AUTH-03).

**Depends on:** 09-03 (favorites must be fetchable in Etusivu before we send them to the API)

### Tasks

#### T-04-1: Update `app/api/saasuositus/route.ts` — add POST handler
Keep existing `GET` handler unchanged (backward compat). Add a new `POST` handler that:
1. Reads `suosikit: string[]` from request body (max 10 items per L-05)
2. Fetches weather from Open Meteo (same as GET)
3. Personalizes the Haiku prompt by appending favorites
4. Returns the same `{ text, temp, code, fallback }` shape

```ts
export async function POST(request: Request) {
  // Parse body
  let suosikit: string[] = []
  try {
    const body = await request.json()
    suosikit = Array.isArray(body.suosikit) ? body.suosikit.slice(0, 10) : []
  } catch {}

  // Weather fetch (same as GET)
  let temp = 15, code = 0
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?...', { next: { revalidate: 1800 } })
    if (res.ok) { const d = await res.json(); temp = Math.round(d.current.temperature_2m); code = d.current.weather_code }
  } catch {}

  const day = DAY_FI[new Date().getDay()]
  const weatherDesc = /* same mapping as GET */

  // Personalized prompt
  const suosikkiLista = suosikit.length
    ? `\nKäyttäjän suosikit: ${suosikit.join(', ')}.`
    : ''

  const prompt = `Tänään on ${day} Tampereella. Lämpötila on ${temp}°C ja sää on ${weatherDesc}. Kirjoita YKSI lyhyt suomenkielinen lause joka suosittelee sopivaa liikuntapalvelua tai -lajia tähän säähän Tampereella. Mainitse "Tampere" tai viittaa liikuntapaikan löytämiseen. Älä käytä emojeja.${suosikkiLista}`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = msg.content[0]
    const text = block.type === 'text' ? block.text.trim() : getTimeBasedFallback()
    return NextResponse.json({ text, temp, code, fallback: false })
  } catch {
    return NextResponse.json({ text: getTimeBasedFallback(), temp, code, fallback: true })
  }
}
```

Extract the weather fetch and weather description logic into a shared helper function to avoid duplication between GET and POST.

#### T-04-2: Update `app/components/Etusivu.tsx` — use POST with favorites for AI call
Change the AI fetch effect from GET to POST when the user is signed in and has favorites:

```ts
useEffect(() => {
  const key = 'saasuositus-' + new Date().toISOString().slice(0, 10)
    + (suosikitIds.size > 0 ? '-' + suosikitIds.size : '') // bust cache when favorites count changes
  try {
    const cached = sessionStorage.getItem(key)
    if (cached) { setAiTeksti(cached); return }
  } catch {}

  // Build suosikit labels for the prompt (nimi only, max 10)
  const suosikkiNimet = Array.from(suosikitIds)
    .slice(0, 10)
    .map(id => paikat.find(p => p.id === id)?.nimi)
    .filter(Boolean) as string[]

  const fetchOptions: RequestInit = suosikkiNimet.length > 0
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suosikit: suosikkiNimet }) }
    : { method: 'GET' }

  fetch('/api/saasuositus', fetchOptions)
    .then(r => r.json())
    .then((d: { text: string; temp: number; code: number; fallback?: boolean }) => {
      setAiTeksti(d.text)
      try { sessionStorage.setItem(key, d.text) } catch {}
    })
    .catch(() => setAiTeksti(getTimeBasedFallback()))
}, [suosikitIds]) // paikat is intentionally excluded — it's a stable server-fetched prop and its reference changing on router.refresh() would cause spurious AI calls; suosikitIds already covers the meaningful dependency
```

**Important:** This effect depends on `suosikitIds` (populated in 09-03). It only fires POST when favorites exist; otherwise falls back to GET for anonymous users. The session cache key includes favorites count to ensure personalized responses are not served stale to new sessions.

### Acceptance criteria
- [ ] `route.ts` has both GET (unchanged) and POST handlers
- [ ] POST handler accepts `suosikit: string[]`, appends to prompt when non-empty, clamps to 10 items
- [ ] Signed-in user with saved favorites gets a personalized AI recommendation (references their saved venues' sport types or names)
- [ ] Signed-out user still gets the generic AI recommendation via GET (no regression)
- [ ] `npm run build` passes
- [ ] Manual test: add 1–3 favorites, navigate home, observe AI widget text changes to mention a relevant sport type

---

## Execution order

```
09-01 (foundation) → 09-02 (auth modal) → [run suosikit SQL in Supabase] → 09-03 (hearts + favorites) → 09-04 (AI)
```

**Manual gate between 09-01 and 09-03:** The `suosikit` table SQL must be run in Supabase before 09-03 can be tested end-to-end. The executor should note this and run the SQL (or confirm it's been run) before proceeding to 09-03.

---

## Threat model

| Threat | Mitigation |
|--------|------------|
| Unauthorized favorite access | RLS policies restrict SELECT/INSERT/DELETE to `auth.uid() = user_id` |
| INSERT to other user's favorites | `WITH CHECK` (not `USING`) on INSERT policy |
| XSS via venue name in AI prompt | Supabase returns only stored names; no user-controlled input in prompt |
| Session fixation | `middleware.ts` refreshes session on every request; `getUser()` not `getSession()` |
| Stale auth state in NavBar | `router.refresh()` after sign-in/sign-out forces RSC re-render with updated `user` |
| Google OAuth misconfiguration | Documented as manual setup step; email/password flow is independent fallback |

---

## Open questions (to resolve before or during execution)

1. **Google OAuth:** Has the callback URL `{SUPABASE_PROJECT_URL}/auth/v1/callback` been added to Google Cloud Console? If not, document as a todo and proceed — email/password auth works independently.
2. **Supabase email confirmation:** Enable or skip for MVP? Skipping (auto-confirm) is faster for v1.1. Supabase Dashboard → Auth → Email → Confirm email: OFF. Document this choice.
3. **SessionStorage AI cache invalidation:** The cache key includes favorites count (`suosikitIds.size`). This means each favorites change busts the cache. Acceptable for MVP.

---

*Plans: 4 | Estimated complexity: High (systemic auth integration)*
*Phase: 09-auth-and-favorites*
*Created: 2026-05-23*
