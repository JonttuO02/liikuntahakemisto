# Phase 41: Navigation Foundation - Research

**Researched:** 2026-06-12
**Domain:** Next.js 14 App Router — RSC layout patterns, client component nav, i18n, glassmorphism design system
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01**: BusinessNav uses the glass pill pattern from NavPill.tsx — same `.glass rounded-full` surface, `MoreHorizontal` trigger, expand-on-click reveal.
- **D-02**: Top-left: "AKTIIVI Business" brand text (or AktiiviLogo + "Business" label) as a Link to `/business`.
- **D-03**: Top-right glass pill: `MoreHorizontal` trigger expands left to reveal Profiili (Link to `/business/profiili`) and Kirjaudu ulos (sign-out button).
- **D-04**: Bottom-left fixed button: A standalone glass pill/button linking to `/business/map`. Link is live from Phase 41 (404 until Phase 42 is acceptable).
- **D-05**: Active state highlighting uses `usePathname()`. Active item gets `text-[#111111] font-bold`; inactive items are muted.
- **D-06**: BusinessNav is a client component (`'use client'`) rendered inside `app/business/layout.tsx`.
- **D-07**: `app/business/layout.tsx` is updated to render BusinessNav above `{children}`.
- **D-08**: BusinessNav component file: `app/components/BusinessNav.tsx`.
- **D-09**: `app/business/kirjaudu/page.tsx` converted to an RSC wrapper that checks session via `createBusinessServerClient(cookies())`. If session exists, `redirect('/business')`.
- **D-10**: RSC redirect is correct approach — no client-side flash.
- **D-11**: Delete `app/components/NavBar.tsx` — not imported anywhere.
- **D-12**: Delete `app/components/NavBarServer.tsx` — not imported anywhere.
- **D-13**: Delete `app/components/ActaLogo.tsx` — only imported by NavBar.tsx.
- **D-14**: All ACTA branding is contained in these three dead files only.
- **D-15**: Sign-out: `createBusinessBrowserClient().auth.signOut()` then `router.push('/business/kirjaudu')`.

### Claude's Discretion
- Exact positioning values for the bottom-left Kartta button (safe-area-inset pattern)
- Whether to use `router.refresh()` or `router.push('/business/kirjaudu')` after sign-out
- Whether `BusinessKirjauduClient.tsx` is extracted as separate file or kept inline
- Icon for the Kartta bottom-left button (Map icon from lucide-react)
- Exact "AKTIIVI Business" label markup (text vs combined with AktiiviLogo)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIZNAV-01 | Business user sees a dedicated BusinessNav bar on all `/business/*` pages with links to Dashboard, Kartta, Profiili, and Kirjaudu ulos | BusinessNav as client component in `app/components/BusinessNav.tsx`, rendered in `app/business/layout.tsx` |
| BIZNAV-02 | Consumer NavBar is not rendered on any `/business/*` page | Verified: NavBar.tsx and NavBarServer.tsx are already deleted from disk; NavPill is not referenced in any `/business/*` route; consumer NavPill only appears in `/paikat/[id]`, `/profiili`, `/tietosuoja` |
| BIZUX-02 | User is automatically redirected to `/business` dashboard after successful login at `/business/kirjaudu` | Success Criterion 3 already satisfied (router.push('/business') in kirjaudu/page.tsx); Success Criterion 4 (already-logged-in redirect) requires RSC wrapper pattern |
</phase_requirements>

---

## Summary

Phase 41 is a focused, low-risk UI phase. The codebase is already well-prepared: the `/business/*` route tree has a passthrough `app/business/layout.tsx` (1 line), the `createBusinessServerClient(cookies())` + `redirect()` RSC pattern is battle-tested in `app/business/onboarding/layout.tsx` and `app/business/[id]/layout.tsx`, and `NavPill.tsx` provides an exact structural template to clone for `BusinessNav.tsx`.

Three deliverables cover all three requirements: (1) create `BusinessNav.tsx` as a client component cloning NavPill's glass-pill architecture with business-specific links and sign-out; (2) update `app/business/layout.tsx` to render `<BusinessNav />` above `{children}`; and (3) wrap `app/business/kirjaudu/page.tsx` in a thin RSC that redirects already-logged-in users to `/business` before rendering the login form. Additionally, dead files `NavBar.tsx`, `NavBarServer.tsx`, and `ActaLogo.tsx` are to be deleted — verified: **all three files are already absent from disk** (only the comment `{/* Map — z-50 covers NavBar (z-40) */}` in Etusivu.tsx remains as a harmless stale comment).

The i18n layer (next-intl 4.13) is already integrated across all business routes. BusinessNav will need new translation keys added to both `messages/fi.json` and `messages/en.json` under the `Business` namespace (no dedicated `BusinessNav` namespace needed — extend the existing `Business` namespace).

**Primary recommendation:** Implement in a single wave: (1) add i18n keys, (2) create BusinessNav.tsx, (3) update layout.tsx, (4) add RSC wrapper to kirjaudu/page.tsx, (5) delete dead files. No new packages required.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BusinessNav render | Frontend Server (RSC layout) | Browser (client component) | Layout.tsx is RSC, BusinessNav itself is `'use client'` for usePathname + signOut |
| Already-logged-in redirect | Frontend Server (RSC) | — | Must be server-side to prevent flash of login form; middleware does not redirect authenticated users away from kirjaudu |
| Active state detection | Browser / Client | — | usePathname() is a client hook; no server equivalent needed |
| Sign-out action | Browser / Client | — | createBusinessBrowserClient().auth.signOut() is browser-only |
| Dead file deletion | — | — | Filesystem operation only |
| i18n key addition | Frontend Server + Client | — | next-intl keys consumed by both RSC and client components |

---

## Standard Stack

### Core (all already in package.json — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.2.35 | App Router, RSC, redirect() | Project standard [VERIFIED: package.json] |
| react | ^18 | Client components | Project standard [VERIFIED: package.json] |
| framer-motion | ^12.38.0 | layout animation, AnimatePresence | NavPill uses it; BusinessNav clones pattern [VERIFIED: package.json] |
| lucide-react | ^1.16.0 | MoreHorizontal, X, Map, LogOut icons | Project standard [VERIFIED: package.json] |
| next-intl | ^4.13.0 | useTranslations for BusinessNav labels | All business routes already use it [VERIFIED: package.json] |
| @supabase/ssr | ^0.10.3 | createBusinessServerClient / createBusinessBrowserClient | Project standard [VERIFIED: package.json] |

### No New Packages Required
This phase requires zero new package installations. All dependencies are present.

---

## Package Legitimacy Audit

No packages are installed in this phase. All required libraries are already in `package.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser request → /business/* route
      │
      ▼
middleware.ts
  └─ isBusiness=true → refresh sb-biz-* session
  └─ if !user && !isPublicPath → redirect to /business/kirjaudu
  └─ if user || isPublicPath → NextResponse.next()
      │
      ▼
app/business/layout.tsx  [RSC]
  └─ renders: <BusinessNav />   ← NEW (client component)
  └─ renders: {children}
      │
      ▼
app/business/kirjaudu/page.tsx  [RSC wrapper — MODIFIED]
  └─ createBusinessServerClient(cookies()).auth.getUser()
  └─ if user → redirect('/business')   ← NEW
  └─ else → render <BusinessKirjauduClient />
      │
      ▼
BusinessNav.tsx  [Client Component — NEW]
  ├─ Top-left: Link href="/business" → "AKTIIVI Business"
  ├─ Top-right: glass pill (MoreHorizontal → Profiili, Kirjaudu ulos)
  │    └─ signOut: createBusinessBrowserClient().auth.signOut() + router.push('/business/kirjaudu')
  └─ Bottom-left fixed: glass-btn rounded-full Link href="/business/map" (Map icon)
```

### Recommended Project Structure (files touched)
```
app/
├── components/
│   ├── BusinessNav.tsx          ← NEW
│   ├── NavBar.tsx               ← DELETE (already gone from disk — skip)
│   ├── NavBarServer.tsx         ← DELETE (already gone from disk — skip)
│   └── ActaLogo.tsx             ← DELETE (already gone from disk — skip)
├── business/
│   ├── layout.tsx               ← MODIFY (add <BusinessNav />)
│   └── kirjaudu/
│       └── page.tsx             ← MODIFY (RSC wrapper + extract client form)
messages/
├── fi.json                      ← MODIFY (add BusinessNav keys to Business namespace)
└── en.json                      ← MODIFY (add BusinessNav keys to Business namespace)
```

### Pattern 1: RSC Already-Logged-In Redirect (canonical codebase pattern)

**What:** An async RSC default export checks session server-side and redirects if authenticated. The login form is extracted as a separate `'use client'` component.
**When to use:** Any public entry page where authenticated users should be forwarded.
**Example (copied from existing `app/business/onboarding/layout.tsx`):**
```typescript
// Source: app/business/onboarding/layout.tsx (canonical project pattern)
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createBusinessServerClient } from '@/lib/supabase-business'

export default async function BusinessKirjauduPage() {
  const supabase = createBusinessServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/business')
  }
  return <BusinessKirjauduClient />
}
```

**Key detail:** `createBusinessServerClient` signature is `createBusinessServerClient(cookieStore: ReadonlyRequestCookies)`. `cookies()` from `next/headers` satisfies this type. The RSC cannot set cookies — `setAll` is a no-op — but `getUser()` only reads.

### Pattern 2: Glass Pill Nav (canonical NavPill.tsx clone)

**What:** A `motion.div` with `layout` animation and `overflow-hidden` creates a pill that grows to reveal content. AnimatePresence handles the expand/collapse of the inner content.
**When to use:** Top-right fixed nav pill — exact clone of NavPill.tsx.

```typescript
// Source: app/components/NavPill.tsx (canonical project pattern)
// Key structure:
<div className="fixed" style={{ top: 'max(12px, env(safe-area-inset-top))', right: 16, zIndex: 64 }}>
  <motion.div
    layout
    transition={{ layout: { type: 'spring', damping: 30, stiffness: 350 } }}
    className="glass rounded-full flex items-center overflow-hidden"
    style={{ height: 40 }}
  >
    <AnimatePresence>
      {open && (
        <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.12, delay: 0.06 }}
          className="flex items-center gap-1 pl-2 whitespace-nowrap"
        >
          {/* links here */}
        </motion.div>
      )}
    </AnimatePresence>
    {/* trigger button */}
  </motion.div>
</div>
```

**Backdrop pattern:** A `fixed inset-0` div at `zIndex: 63` (one below the pill at `zIndex: 64`) catches outside clicks and closes the pill.

### Pattern 3: Bottom-Left Fixed Glass Button

**What:** A standalone fixed glass pill button (not an expanding pill) at bottom-left. Simpler than NavPill — just a link with an icon.
**Positioning:** Use `bottom` + `left` with safe-area-inset:
```typescript
// Modeled on safe-area patterns from Etusivu.tsx (line 1498)
style={{
  position: 'fixed',
  bottom: 'max(16px, env(safe-area-inset-bottom))',
  left: 16,
  zIndex: 64
}}
```
**Active state:** When `pathname === '/business/map'`, apply `text-[#111111] font-bold`; otherwise muted `text-[rgba(17,17,17,0.7)]`.

### Pattern 4: i18n Key Extension for BusinessNav

**What:** next-intl keys for BusinessNav labels are added to the existing `Business` namespace in `messages/fi.json` and `messages/en.json`. No separate namespace needed.
**Keys to add:**
```json
// In Business namespace (fi.json):
"navDashboard": "AKTIIVI Business",
"navMap": "Kartta",
"navProfile": "Profiili",
"navSignOut": "Kirjaudu ulos",
"navOpenMenu": "Avaa valikko",
"navCloseMenu": "Sulje valikko"
```
```json
// In Business namespace (en.json):
"navDashboard": "AKTIIVI Business",
"navMap": "Map",
"navProfile": "Profile",
"navSignOut": "Sign out",
"navOpenMenu": "Open menu",
"navCloseMenu": "Close menu"
```

**In BusinessNav.tsx:** `const t = useTranslations('Business')` — consistent with all other business components.

### Anti-Patterns to Avoid

- **Do NOT use `router.refresh()` after sign-out in BusinessNav:** `router.push('/business/kirjaudu')` is correct — we want navigation to login, not in-place state refresh. NavPill uses `router.refresh()` because the consumer stays on the same page.
- **Do NOT add `async` to `app/business/layout.tsx` without also making it an RSC:** The layout currently has no `async` keyword and no `'use client'` — it is implicitly an RSC. Adding `<BusinessNav />` (a client component) to a non-async RSC is valid — no change to the layout's async status needed.
- **Do NOT import `AktiiviLogo` for the top-left brand text:** AktiiviLogo has a complex sweep animation using framer-motion `animate()` in a `useEffect` loop — too heavy for a nav label. Use plain text "AKTIIVI Business" as a bold Link per D-02. If AktiiviLogo is used, it will run the animation on every page load inside nav.
- **Do NOT add `subscribeToAuthUser` to BusinessNav:** NavPill uses `subscribeToAuthUser` to detect consumer sign-in state for showing/hiding the Profiili link. BusinessNav does NOT need this — middleware already guarantees the user is authenticated on all non-public `/business/*` routes. The Profiili link is always shown.
- **Do NOT put the RSC session check in `app/business/layout.tsx`:** The layout-level RSC redirect already exists via middleware. The kirjaudu page-specific redirect (D-09) belongs in `kirjaudu/page.tsx`, not the shared layout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pill expand animation | Custom CSS transitions | `motion.div` with `layout` + `AnimatePresence` | NavPill.tsx already solved this; exact spring values (damping 30, stiffness 350) produce project-standard feel |
| Session check in client | `useEffect` + browser auth | `createBusinessServerClient(cookies()).auth.getUser()` in RSC | Prevents flash of login form; consistent with onboarding/layout.tsx pattern |
| Outside-click dismiss | Event listeners | Fixed backdrop div at `zIndex: 63` | NavPill pattern; simpler and works correctly with z-index stacking |
| i18n strings | Hardcoded Finnish | `useTranslations('Business')` | All other business components use this; required for BIZPRO-03 (language toggle in Phase 43) |

**Key insight:** BusinessNav is architecturally a structural clone of NavPill.tsx with business-specific substitutions. Do not design from scratch — diff the two use cases and apply changes.

---

## Common Pitfalls

### Pitfall 1: Dead Files Already Deleted

**What goes wrong:** Plan tasks to delete NavBar.tsx, NavBarServer.tsx, ActaLogo.tsx — but all three are already absent from disk (verified: `ls app/components/` shows they are not present).
**Why it happens:** CONTEXT.md describes them as "dead files to delete" based on a state captured before Phase 40 cleanup completed.
**How to avoid:** Plan must check file existence before attempting delete, or simply skip delete tasks with a note that the files are already gone. The stale comment in Etusivu.tsx line 1054 (`{/* Map — z-50 covers NavBar (z-40) */}`) can optionally be cleaned up but is harmless.
**Warning signs:** `git rm` or `unlink` failing with "file not found" during execution.

### Pitfall 2: cookies() is Async in Next.js 15 but Sync in Next.js 14

**What goes wrong:** Using `await cookies()` (Next.js 15 syntax) in an RSC when the project is on Next.js 14.2.35.
**Why it happens:** Next.js 15 made `cookies()` async; 14.x `cookies()` is synchronous.
**How to avoid:** Use `cookies()` without `await`. The existing codebase (onboarding/layout.tsx, [id]/layout.tsx) always uses `createBusinessServerClient(cookies())` synchronously — follow this pattern exactly.
**Warning signs:** TypeScript error `Type 'Promise<...>' is not assignable to parameter of type 'ReadonlyRequestCookies'`.

### Pitfall 3: layout.tsx Becomes an RSC But Already Is One

**What goes wrong:** Mistakenly adding `'use client'` to `app/business/layout.tsx` because it will contain a client component (BusinessNav).
**Why it happens:** Confusion about RSC/client boundary — a server component can render a client component as a child.
**How to avoid:** `app/business/layout.tsx` must remain an RSC (no `'use client'` directive). It renders `<BusinessNav />` (client) as a child — this is valid and standard App Router pattern. The client boundary starts inside BusinessNav, not at the layout level.
**Warning signs:** `usePathname` or other client hooks not working in BusinessNav, or errors about server-only APIs used in client components.

### Pitfall 4: z-index Conflict With Etusivu's Backdrop

**What goes wrong:** BusinessNav's backdrop div (zIndex 63) or pill (zIndex 64) conflicts with Etusivu's overlay system on the consumer side.
**Why it happens:** Consumer Etusivu uses zIndex 60–66 range extensively.
**How to avoid:** Not an issue — BusinessNav is only rendered inside `app/business/layout.tsx`, which covers `/business/*` routes only. Etusivu runs on `/` (root route). The layouts are completely separate route trees.

### Pitfall 5: Missing i18n Keys Cause Runtime Error in Production

**What goes wrong:** BusinessNav renders with `t('navDashboard')` but the key doesn't exist in messages files — next-intl throws an error or renders empty string.
**Why it happens:** Keys are added to the component but not to messages/fi.json and messages/en.json.
**How to avoid:** i18n key additions to both message files must be part of the same task/commit as BusinessNav component creation. Verify with `t('navDashboard')` in fi.json before committing.

---

## Code Examples

### RSC Wrapper for kirjaudu/page.tsx

```typescript
// Pattern: already-logged-in redirect (mirrors onboarding/layout.tsx)
// Source: app/business/onboarding/layout.tsx (canonical codebase pattern)
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createBusinessServerClient } from '@/lib/supabase-business'
import BusinessKirjauduClient from './BusinessKirjauduClient'

export default async function BusinessKirjauduPage() {
  const supabase = createBusinessServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/business')
  }
  return <BusinessKirjauduClient />
}
```

The existing `kirjaudu/page.tsx` content (the login form JSX) becomes `BusinessKirjauduClient.tsx` with `'use client'` at the top — the existing imports and state are unchanged.

### BusinessNav layout.tsx integration

```typescript
// app/business/layout.tsx — AFTER modification
import BusinessNav from '@/app/components/BusinessNav'

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BusinessNav />
      {children}
    </>
  )
}
```

No `async` needed — BusinessNav is a client component and requires no server data at the layout level.

### BusinessNav sign-out handler

```typescript
// Source: pattern from NavPill.tsx with push instead of refresh
async function handleSignOut() {
  setOpen(false)
  try {
    await createBusinessBrowserClient().auth.signOut()
  } finally {
    router.push('/business/kirjaudu')
  }
}
```

### Bottom-left Kartta button positioning

```typescript
// Mirrors safe-area-inset-bottom pattern from Etusivu.tsx line 1498
<div
  className="fixed"
  style={{
    bottom: 'max(16px, env(safe-area-inset-bottom))',
    left: 16,
    zIndex: 64,
  }}
>
  <Link
    href="/business/map"
    className={`w-10 h-10 glass-btn rounded-full flex items-center justify-center ${
      pathname === '/business/map'
        ? 'text-[#111111]'
        : 'text-[rgba(17,17,17,0.7)] hover:text-[#111111]'
    } [transition:color_150ms_var(--ease-out)]`}
    aria-label={t('navMap')}
  >
    <Map className="w-4 h-4" />
  </Link>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NavBar.tsx (sticky indigo header) | NavPill (fixed glass pill top-right) | Phase 17 (v1.3) | BusinessNav must use NavPill pattern, NOT the old sticky header |
| ActaLogo branding | AktiiviLogo with sweep animation | Phase 16 (v1.3) | Use "AKTIIVI Business" text in nav, not logo SVG — animation too heavy for nav |
| cookies() async (Next.js 15) | cookies() sync (Next.js 14.2.x) | — | Project is on 14.2.35; use synchronous call |

**Deprecated/outdated:**
- NavBar.tsx / NavBarServer.tsx / ActaLogo.tsx: All three are already deleted from disk. CONTEXT.md still lists them as "to delete" — planner should verify file existence before generating delete tasks.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | NavBar.tsx, NavBarServer.tsx, ActaLogo.tsx are already deleted from disk | Common Pitfalls, Architecture | Risk LOW — verified by `ls app/components/` at research time; if somehow they reappear in git, delete tasks are trivial |
| A2 | AktiiviLogo component is too heavy for nav (animation loop) | Don't Hand-Roll | Risk LOW — verified by reading AktiiviLogo.tsx source; the `useEffect` runs a continuous `animate()` loop |
| A3 | No dedicated BusinessNav translation namespace is needed; extending Business namespace is correct | Code Examples | Risk LOW — all existing business components use `useTranslations('Business')`; adding navX keys is consistent |

**If this table is empty:** N/A — 3 assumptions above.

---

## Open Questions

1. **Stale comment in Etusivu.tsx line 1054**
   - What we know: `{/* Map — z-50 covers NavBar (z-40) */}` — refers to the deleted NavBar component
   - What's unclear: Whether cleanup of this comment is in scope for Phase 41
   - Recommendation: Out of scope for Phase 41 (harmless comment, no behavior); add to cleanup backlog

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase creates a client component and modifies existing RSC files only; no new services, CLIs, or external tools required)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.7 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZNAV-01 | BusinessNav renders on /business/* pages | manual-only | — | N/A — client component visual rendering, no unit test surface |
| BIZNAV-02 | Consumer NavBar absent from /business/* | manual-only | — | N/A — layout-level rendering, requires browser verification |
| BIZUX-02 (SC-4) | Already-logged-in redirect from kirjaudu | manual-only | — | N/A — requires real Supabase session |

**Rationale for manual-only:** All three requirements involve React component rendering and authenticated navigation flows. The existing test suite (`tests/api/`) covers API route logic only. There is no jsdom/browser environment configured in vitest (environment is `node`). Integration tests for navigation and auth state require a running Next.js server with a real Supabase session. Manual verification against success criteria is the correct approach for this phase.

### Sampling Rate
- **Per task commit:** `npx vitest run` (confirms no regressions in API tests)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Manual browser walk-through of all 4 success criteria before `/gsd:verify-work`

### Wave 0 Gaps
None — no new test files are required for this phase. Existing `tests/api/update-paikka.test.ts` is unaffected.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `createBusinessServerClient(cookies()).auth.getUser()` — uses JWT verification via Supabase |
| V3 Session Management | yes | sb-biz-* cookie namespace; middleware refreshes token on every request |
| V4 Access Control | yes | Middleware guards all `/business/*` non-public paths; RSC adds reverse redirect for kirjaudu |
| V5 Input Validation | no | No user input in this phase (nav links and sign-out only) |
| V6 Cryptography | no | No direct crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Flash of authenticated content at login page | Information Disclosure | RSC redirect at page.tsx before rendering — user never sees login form if already authenticated |
| Session fixation after sign-out | Elevation of Privilege | `createBusinessBrowserClient().auth.signOut()` clears sb-biz-* cookies; consumer sb-* session unaffected |
| Consumer session leakage to business nav | Information Disclosure | BusinessNav uses `createBusinessBrowserClient()` exclusively — reads sb-biz-* cookie, never sb-* |

---

## Sources

### Primary (HIGH confidence)
- `app/components/NavPill.tsx` — Full source read; glass pill pattern, animation values, z-index, sign-out pattern
- `lib/supabase-business.ts` — Full source read; `createBusinessServerClient(cookieStore)` signature verified
- `app/business/onboarding/layout.tsx` — Full source read; canonical RSC redirect pattern
- `app/business/layout.tsx` — Full source read; confirmed passthrough RSC (3 lines)
- `app/business/kirjaudu/page.tsx` — Full source read; confirmed full client component with existing `router.push('/business')`
- `app/components/Etusivu.tsx` — grep scan; safe-area-inset patterns, z-index inventory
- `messages/fi.json`, `messages/en.json` — Full Business namespace keys read; Nav namespace keys read
- `package.json` — Dependency versions verified
- `vitest.config.ts` — Test config verified
- `app/globals.css` — `.glass`, `.glass-btn`, `.glass-nav` utility classes verified

### Secondary (MEDIUM confidence)
- `CLAUDE.md` design guidelines — Color tokens, animation durations, component conventions

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json; no new packages needed
- Architecture: HIGH — all patterns verified from canonical codebase examples
- Pitfalls: HIGH — dead file status verified by ls; cookie() sync/async verified from project Next.js version; pitfall about layout RSC boundary verified from Next.js App Router behavior
- i18n: HIGH — namespace and key structure verified by reading messages files

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable stack, no fast-moving dependencies)
