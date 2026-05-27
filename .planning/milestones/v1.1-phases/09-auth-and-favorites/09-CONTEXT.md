# Phase 9: Auth & Favorites - Context

**Gathered:** 2026-05-22
**Updated:** 2026-05-23 — UI placement decisions revised to reflect Etusivu bottom sheet refactor
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Supabase Auth (email/password + Google OAuth) with a modal-based sign-in/sign-up UI, a `suosikit` favorites table with heart/un-heart on three venue surfaces (list cards, map bottom sheet, profile page), and personalized AI recommendations that include saved favorites in the prompt.

Requirements: AUTH-01, AUTH-02, AUTH-03.

**Out of scope:** Dedicated `/suosikit` favorites list page (v1.2), password reset flow (v1.2), social login beyond Google, email verification configuration (Claude's discretion), push notifications, user profile page.

</domain>

<decisions>
## Implementation Decisions

### Sign-in UI (AUTH-01)
- **D-01:** Auth form appears as a **glass-surface modal overlay** — not a dedicated page. Uses `AnimatePresence` consistent with the existing bottom-sheet pattern. Success criteria: "without leaving the app" is met literally.
- **D-02:** Modal is triggered **by tapping the heart button when signed out** as the primary trigger. NavBar dropdown also gets a 'Kirjaudu' entry as a secondary trigger.
- **D-03:** **Single modal with toggle** — one component with a 'Kirjaudu' / 'Luo tili' tab or link switch. No separate sign-up modal.
- **D-04:** After successful sign-in: modal closes, `router.refresh()` updates server session, **pending favorite auto-completes** (the heart tap that triggered auth is remembered and applied).

### Heart Button (AUTH-02)
- **D-05:** Heart button appears on **all three surfaces**: `PaikkaKortti.tsx` (list cards), `Etusivu.tsx` bottom-sheet (map), `app/paikat/[id]/page.tsx` (profile page).
- **D-06:** For signed-out users: heart is **always visible, unfilled**. Tapping opens the auth modal. No greyed-out state, no tooltip. Signed-out state is visually indistinguishable from "not saved yet."
- **D-07:** On `PaikkaKortti`: heart is **top-right corner, absolutely positioned** over the card surface (above the `.glass` container). Does not affect the existing flex-col card layout.

### NavBar Auth State
- **D-08:** When signed in: **user's email (truncated) + 'Kirjaudu ulos'** in the hamburger dropdown. No avatar image. Existing dropdown link area is reused.
- **D-09:** When signed out: **'Kirjaudu' link in the hamburger dropdown** opens the auth modal.
- **D-10:** NavBar auth state is read **server-side**: `middleware.ts` refreshes the session cookie on each request; `app/layout.tsx` (or a wrapper) calls `supabase.auth.getUser()` and passes the result down as a prop. NavBar becomes a server-aware component. No client-side `useSession` hook.

> **⚠️ Post-phase-8 constraint:** NavBar is **NOT visible on the home page** (`/`). The map is `position: fixed, z-50`, which covers the NavBar (`z-40`). D-08/D-09 apply on all pages where NavBar is visible (`/paikat/[id]`, `/suosikit`, `/tietosuoja`). On the home page, auth state indicators (signed-in user, 'Kirjaudu' trigger) must be placed in the **right top-corner toolbar** (`MoreHorizontal` expands left). See D-08-HOME below.

- **D-08-HOME:** On the home page, the right toolbar (currently shows `Search` + `Heart`) must also surface auth state: when signed in, show user indicator or 'Kirjaudu ulos'; when signed out, tapping 'Heart' triggers the auth modal (primary trigger, D-02 still applies). The exact right-toolbar layout for auth state is left to Claude's discretion during planning.

### AI Personalization (AUTH-03)
- **D-11:** Favorites reach `/api/saasuositus` **via the request body from the client**. `Etusivu.tsx` fetches the user's favorites from Supabase on mount (when signed in), then includes them in the POST body alongside weather data.
- **D-12:** Prompt change: **append favorites to the existing system prompt** — e.g., `Käyttäjän suosikit: [Tampereen Uintikeskus (uinti), Arena Center (kuntosali)]`. Max 5–10 venues per AUTH-03 token budget. No structural change to the prompt template.
- **D-13:** Signed-out users (no favorites): **no change** — same generic recommendation. No 'sign in to personalize' hint in the widget.

### Locked Decisions (from prior phases / STATE.md)
- **L-01:** `middleware.ts` is the **first deliverable** of Phase 9 — must exist before any auth-dependent features.
- **L-02:** Use `@supabase/ssr` package — `createServerClient` per-request, `createBrowserClient` for client components. Never the existing module-scope `supabase` singleton for auth.
- **L-03:** Server-side auth: always `supabase.auth.getUser()`, never `getSession()` (unvalidated cookie).
- **L-04:** Favorites table RLS INSERT rule: use `WITH CHECK`, not `USING`. `INSERT` only to own `user_id`.
- **L-05:** AI token budget: include **max 5–10 favorites** in Haiku prompt (AUTH-03).
- **L-06:** LEGAL-01 is live (Phase 6 complete) — auth can ship. ✅

### Claude's Discretion
- Exact favorites table name (`suosikit` preferred for consistency with Finnish naming)
- Whether to enable Supabase email confirmation or skip it for the MVP (project setting in Supabase dashboard)
- Heart icon: Lucide `Heart` component, fill state via Tailwind `fill-[#111111]` when saved
- Heart animation: `whileTap={{ scale: 0.9 }}` consistent with filter button pattern
- Whether `suosikki` state loads eagerly on Etusivu mount or lazily on first heart interaction
- Exact JSX position of the heart in the Etusivu bottom-sheet (likely next to the venue name or in the header row)
- Whether `app/suosikit/page.tsx` (current stub) redirects to `/` or shows a "Kirjaudu ensin" message

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02, AUTH-03 (the three phase requirements)
- `.planning/ROADMAP.md` Phase 9 — success criteria and dependency note (LEGAL-01 prerequisite)

### Components to modify
- `app/components/NavBar.tsx` — add 'Kirjaudu' / 'Kirjaudu ulos' to hamburger dropdown; read auth state from props
- `app/components/PaikkaKortti.tsx` — add top-right absolute heart button (D-07)
- `app/components/Etusivu.tsx` — add heart to bottom-sheet, fetch favorites on mount (D-11), pass to AI route
- `app/paikat/[id]/page.tsx` — add heart button to profile page (D-05)
- `app/api/saasuositus/route.ts` — update to accept and use favorites in prompt (D-12)

### New files to create
- `middleware.ts` (project root) — first deliverable; refreshes Supabase session cookie on each request (L-01)
- `app/components/AuthModal.tsx` — glass modal with sign-in/sign-up toggle (D-01, D-03)
- New Supabase migration — `suosikit` table with `user_id uuid FK auth.users` + `paikka_id int FK liikuntapaikat`

### Supabase / Auth
- `lib/supabase.ts` — existing clients; new `createBrowserClient` and `createServerClient` helpers from `@supabase/ssr` needed alongside existing clients
- `lib/types.ts` — `Liikuntapaikka` type; new `Suosikki` type needed for favorites table
- Supabase Auth docs: Google OAuth requires callback URL `{SUPABASE_URL}/auth/v1/callback` added to Google Cloud Console + Supabase Auth redirect URL configured in dashboard

### Design system
- `CLAUDE.md` — glassmorphism utilities, color tokens, animation rules. Modal uses `.glass` surface.
- `app/globals.css` — `.glass`, `.glass-btn` class definitions for modal and heart button

### Layout / server context
- `app/layout.tsx` — root layout; needs to fetch `getUser()` and pass auth state to NavBar (D-10)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AnimatePresence` (Framer Motion) — already used in `Etusivu.tsx` for view transitions and bottom-sheet. Auth modal uses the same `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}` pattern.
- `.glass` surface class — existing CSS utility in `globals.css`. Auth modal panel uses `.glass rounded-2xl p-6`.
- `buttonVariants()` from `components/ui/button.tsx` — for auth form submit buttons (email/password form).
- `Lucide` icons — already imported in multiple components. Add `Heart`, `HeartOff` (or use fill state on `Heart`).
- `whileTap={{ scale: 0.95 }}` — established filter button animation. Heart button uses same tap feedback.
- `router.refresh()` — from `next/navigation`; already pattern in the codebase for re-triggering server fetches.

### Established Patterns
- Per-request `createServerClient` — `middleware.ts` must follow the Supabase SSR Next.js pattern exactly. Do not reuse the module-scope `supabase` singleton for auth.
- Server component data-fetching shell (`app/page.tsx`, `app/paikat/[id]/page.tsx`) — auth state check follows same pattern: `getUser()` in the server component, passed as prop.
- `useState` for modal open/closed — consistent with the `sheetPhase` state machine pattern in `Etusivu.tsx` (post-refactor).
- NavBar is currently `'use client'` — switching to server-component-aware may require extracting auth state reading to a parent RSC or passing via props from layout.
- **Home page UI context (post-phase-8):** `Etusivu.tsx` now uses a bottom sheet (`sheetPhase`) with a left toolbar (filters) and right toolbar (`MoreHorizontal` → Search + Heart). Heart auth trigger on the home page routes through the right toolbar, not NavBar. Auth modal (`AnimatePresence`) works the same way as before.

### Integration Points
- `app/layout.tsx` — will need to call `getUser()` and pass `user` prop to `NavBar`. This is the only layout-level change.
- `app/page.tsx` — may need to receive `user` to pass to `Etusivu` for favorites fetching.
- `/api/saasuositus` POST body — currently receives `{ lajit, coords, weather }` or similar. Add optional `suosikit: string[]` field (venue names + sport pairs).
- Supabase `suosikit` table — INSERT and DELETE via `createBrowserClient` from client components. SELECT for favorites list also client-side on mount.

</code_context>

<specifics>
## Specific Ideas

### middleware.ts pattern (Supabase SSR Next.js)
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* get/set/delete handlers */ } }
  )
  await supabase.auth.getUser() // refreshes session
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

### Heart button in PaikkaKortti (top-right absolute)
```tsx
<div className="relative"> {/* or on the existing .glass wrapper */}
  <button
    className="absolute top-2 right-2 z-10 p-1"
    onClick={(e) => { e.preventDefault(); onToggleSuosikki(paikka.id) }}
  >
    <Heart className={cn('w-5 h-5', isSuosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
  </button>
  {/* existing card content */}
</div>
```

### Favorites in AI prompt
```ts
// In /api/saasuositus, when suosikit are present:
const suosikkiLista = suosikit?.length
  ? `\nKäyttäjän suosikit: ${suosikit.slice(0, 10).join(', ')}.`
  : ''
// Append suosikkiLista to the existing system prompt string
```

### Google OAuth callback URL
Add to Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs:
`https://{YOUR_SUPABASE_PROJECT}.supabase.co/auth/v1/callback`

Also add to Supabase Dashboard → Auth → URL Configuration → Redirect URLs:
`http://localhost:3000` (dev) and the production domain.

</specifics>

<deferred>
## Deferred Ideas

- **Dedicated `/suosikit` favorites list page** — Future Requirements in REQUIREMENTS.md; v1.2. The stub `app/suosikit/page.tsx` can remain as-is or show a redirect.
- **Password reset flow** — not in AUTH-01/02/03 scope; v1.2.
- **Käyttäjäprofiili / settings page** — Future Requirements; v1.2.
- **Social login beyond Google** — out of scope for Phase 9.
- **Anonymous Supabase session for favorites** — explicitly out of scope per REQUIREMENTS.md ("anonyymi Supabase-tili — suosikit vaativat oikean kirjautumisen").

</deferred>

---

*Phase: 09-auth-and-favorites*
*Context gathered: 2026-05-22*
