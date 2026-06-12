# Phase 41: Navigation Foundation - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds a dedicated `BusinessNav` component to the `/business/*` area and handles the already-logged-in redirect at `/business/kirjaudu`. Three requirements are addressed:

- **BIZNAV-01**: BusinessNav rendered on all `/business/*` pages with links to Dashboard (AKTIIVI Business brand → /business), Kartta (/business/map), and a top-right pill expanding to Profiili + Kirjaudu ulos
- **BIZNAV-02**: Consumer NavBar absent from `/business/*` — already satisfied (NavBar is only inside `Etusivu.tsx`; planner must verify and may delete dead files `NavBar.tsx`, `NavBarServer.tsx`, `ActaLogo.tsx`)
- **BIZUX-02**: Post-login redirect to `/business` already implemented (`router.push('/business')` in kirjaudu/page.tsx); missing piece is the **already-logged-in redirect** (Success Criterion 4)

</domain>

<decisions>
## Implementation Decisions

### BusinessNav visual design (BIZNAV-01)

- **D-01**: BusinessNav uses the **glass pill pattern** from the consumer nav (`NavPill.tsx`) — same `.glass rounded-full` surface, `MoreHorizontal` trigger, expand-on-click reveal.
- **D-02**: **Top-left**: "AKTIIVI Business" brand text (or AktiiviLogo + "Business" label) as a Link to `/business`. This satisfies the Dashboard link in BIZNAV-01 — no separate "Dashboard" nav item needed.
- **D-03**: **Top-right glass pill**: `MoreHorizontal` trigger expands left to reveal Profiili (Link to `/business/profiili`) and Kirjaudu ulos (sign-out button). Same expand animation as NavPill.tsx.
- **D-04**: **Bottom-left fixed button**: A standalone glass pill/button linking to `/business/map` (Kartta). Positioned at `fixed bottom-left` — mirrors the style of the fixed tool buttons in Etusivu.tsx. Link is live from Phase 41 (the page doesn't exist until Phase 42; hitting 404 is acceptable while Phase 42 is pending).
- **D-05**: **Active state highlighting**: Uses `usePathname()` to detect current route. The active nav item (Profiili when on `/business/profiili`) gets `text-[#111111] font-bold`; inactive items are muted. Same logic applies to the Kartta bottom-left button.
- **D-06**: BusinessNav is a client component (`'use client'`) — needs `usePathname()` and `createBusinessBrowserClient().auth.signOut()`. It is rendered inside `app/business/layout.tsx`.

### Layout integration

- **D-07**: `app/business/layout.tsx` is updated to render BusinessNav above `{children}`. The layout is already an RSC (middleware guards auth for `/business/*` routes).
- **D-08**: BusinessNav component file: `app/components/BusinessNav.tsx` (in the shared components directory, consistent with how consumer NavPill.tsx lives there).

### Already-logged-in redirect (BIZUX-02 Success Criterion 4)

- **D-09**: `app/business/kirjaudu/page.tsx` is converted to an RSC wrapper that checks the business session server-side using `createBusinessServerClient(cookies())`. If a valid session exists, return `redirect('/business')`. Otherwise render the existing client login form (extracted as `BusinessKirjauduClient.tsx` or kept inline as the `'use client'` export).
- **D-10**: The RSC redirect is the correct approach — no client-side flash of the login form for already-logged-in users.

### Dead files cleanup (user-requested)

- **D-11**: Delete `app/components/NavBar.tsx` — not imported anywhere (only referenced in dead `NavBarServer.tsx`). Dead since the nav was rebuilt into Etusivu.tsx's inline pill toolbars.
- **D-12**: Delete `app/components/NavBarServer.tsx` — not imported anywhere in the app. Dead file.
- **D-13**: Delete `app/components/ActaLogo.tsx` — only imported by `NavBar.tsx` (also being deleted). Contains old "ACTA" branding; `AktiiviLogo.tsx` is the current logo component.
- **D-14**: All "ACTA" branding references are contained in these three dead files. No other files reference ACTA — verified by grep.

### Sign-out behavior

- **D-15**: Sign-out clears the `sb-biz-*` session via `createBusinessBrowserClient().auth.signOut()` and redirects to `/business/kirjaudu`. Consumer session (`sb-*`) is unaffected. Pattern matches existing `handleSignOut` in `NavPill.tsx` with `router.refresh()` after signOut.

### Claude's Discretion

- Exact positioning values for the bottom-left Kartta button (safe-area-inset, offset from bottom, left spacing) — follow the same `max(12px, env(safe-area-inset-top))` safe-area pattern from Etusivu.tsx for the bottom equivalent
- Whether to use `router.refresh()` or `router.push('/business/kirjaudu')` after sign-out — `router.push` is cleaner since we want navigation, not in-place refresh
- Whether `BusinessKirjauduClient.tsx` is extracted as a separate file or kept as the default export from the original file (and the RSC wrapper added as an intermediate layout or inline — Claude's choice)
- Icon for the Kartta bottom-left button (Map icon from lucide-react is appropriate)
- Exact "AKTIIVI Business" label markup (text vs combined with AktiiviLogo)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — BIZNAV-01, BIZNAV-02, BIZUX-02 (Phase 41 scope)
- `.planning/ROADMAP.md` §Phase 41 — Goal, success criteria, and UI hint

### Design system and patterns to follow
- `app/components/NavPill.tsx` — The exact consumer glass pill pattern to replicate for BusinessNav (MoreHorizontal trigger, AnimatePresence expand, .glass rounded-full, same height/button styles)
- `app/globals.css` — `.glass`, `.glass-btn`, `.glass-nav` utility classes (use these, never inline)
- `CLAUDE.md` — Design guidelines: glassmorphism system, animation principles, color tokens

### Auth architecture (Phase 39 decisions)
- `.planning/phases/39-auth-separaatio/39-CONTEXT.md` — Auth separation decisions (D-01 through D-15): `createBusinessServerClient()` / `createBusinessBrowserClient()` in `lib/supabase-business.ts`; middleware guards `/business/*` and redirects unauthenticated users to `/business/kirjaudu`
- `lib/supabase-business.ts` — Business client factory (createBusinessBrowserClient, createBusinessServerClient)
- `middleware.ts` — Path-conditional session refresh; `/business/kirjaudu` and `/business/rekisteroidy` are excluded from the auth guard

### Files being modified
- `app/business/layout.tsx` — Add BusinessNav render (currently passthrough)
- `app/business/kirjaudu/page.tsx` — Add RSC already-logged-in redirect wrapper

### Files being deleted (dead code cleanup)
- `app/components/NavBar.tsx` — Dead (not imported anywhere)
- `app/components/NavBarServer.tsx` — Dead (not imported anywhere)
- `app/components/ActaLogo.tsx` — Dead (only imported by NavBar.tsx)

### New files
- `app/components/BusinessNav.tsx` — New BusinessNav client component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/NavPill.tsx` — Full source to copy the glass pill pattern: layout animation, AnimatePresence expand, MoreHorizontal/X toggle, `.glass rounded-full`, `glass-btn` link/button style. BusinessNav should be a structural clone with business-specific links.
- `lib/supabase-business.ts` — `createBusinessBrowserClient()` for sign-out; `createBusinessServerClient(cookies())` for RSC session check in kirjaudu/page.tsx
- `app/components/AktiiviLogo.tsx` — Current logo component (use for "AKTIIVI Business" branding in top-left)

### Established Patterns
- **Fixed pill positioning**: `fixed`, `top: max(12px, env(safe-area-inset-top))`, `right: 16`, `zIndex: 64` — from NavPill.tsx and Etusivu.tsx toolbars. BusinessNav top-right pill follows this exactly.
- **Sign-out pattern**: `createBusinessBrowserClient().auth.signOut()` then `router.push('/business/kirjaudu')` — mirrors NavPill's `signOut()` + `router.refresh()` but pushes to business login.
- **Active state**: `usePathname()` from `next/navigation` — use `pathname === '/business/profiili'` checks to apply `text-[#111111] font-bold` vs muted inactive color.
- **RSC session check**: `createBusinessServerClient(cookies()).auth.getUser()` — returns `{ data: { user } }`; if user exists, `return redirect('/business')` from `next/navigation`.

### Integration Points
- `app/business/layout.tsx` → renders BusinessNav; all `/business/*` pages pick it up automatically
- `app/business/kirjaudu/page.tsx` → RSC wrapper for already-logged-in redirect; existing login form unchanged
- Middleware already handles unauthenticated redirects to `/business/kirjaudu` — Phase 41 adds the reverse (authenticated → skip login form)

</code_context>

<specifics>
## Specific Ideas

- BusinessNav top-right pill is structurally identical to `NavPill.tsx` — same component architecture, same animation values, same CSS classes. The only differences are: (a) business-specific links, (b) `createBusinessBrowserClient()` instead of `createBrowserSupabase()`, (c) no `AuthModal`.
- Bottom-left Kartta button: a standalone `glass-btn rounded-full` fixed button (not a pill-expand pattern) — simpler since it's just one link.
- "AKTIIVI Business" top-left: rendered as a `Link href="/business"` with small text or combined with the logo. No need for a full logo treatment — simple bold text is fine.
- The three dead files (NavBar.tsx, NavBarServer.tsx, ActaLogo.tsx) contain the old "ACTA" branding and old expanding-header pattern. All ACTA references in the codebase are confined to these files — confirmed clean.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 41-navigation-foundation*
*Context gathered: 2026-06-12*
