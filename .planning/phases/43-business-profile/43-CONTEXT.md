# Phase 43: Business Profile - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers `/business/profiili` — a dedicated profile page for business users. Four requirements are addressed:

- **BIZPRO-01**: Read-only display: company name (from `business_accounts.company_name`) + auth login email (from session) + 'Yritystili' account type badge
- **BIZPRO-02**: Editable phone number only (`contact_phone` — new column in `business_accounts`). Phone is the admin-to-user contact channel; venue contact info (puhelin, sähköposti, website per venue) is already handled by the WizardInner and is NOT on this page.
- **BIZPRO-03**: FI/EN language toggle that persists via `NEXT_LOCALE` cookie and refreshes UI immediately
- **BIZPRO-04**: Sign-out clears `sb-biz-*` session and redirects to `/business/kirjaudu`; consumer session unaffected

</domain>

<decisions>
## Implementation Decisions

### Contact fields and DB migration (BIZPRO-02)

- **D-01**: Only one editable contact field: `contact_phone TEXT NULLABLE`. New migration adds this column to `business_accounts`.
- **D-02**: No `contact_email` or `contact_website` on the profile page. Venue-level contact info (puhelin, email, website per venue) is managed via WizardInner — not duplicated here. This is the business user's personal phone for admin-to-user contact only.
- **D-03**: Migration: `ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS contact_phone TEXT;` — nullable, no default, no constraints. RLS already allows UPDATE for own account.

### Page architecture (RSC + client split)

- **D-04**: `app/business/profiili/page.tsx` — RSC wrapper. Fetches `company_name` and `contact_phone` from `business_accounts` using `createBusinessServerClient(cookies())`. Gets auth email from `getUser()`. Passes all as props to the client component.
- **D-05**: `app/business/profiili/BusinessProfiiliClient.tsx` — client component (`'use client'`). Receives `companyName`, `email`, `contactPhone` as props. Handles phone input state, save, language toggle, and sign-out.
- **D-06**: If `business_accounts` row is not found for the session user (edge case), RSC redirects to `/business` — same pattern as other RSC guards.

### Save mechanism (BIZPRO-02)

- **D-07**: Direct Supabase browser client for phone save: `createBusinessBrowserClient().from('business_accounts').update({ contact_phone: trimmed }).eq('user_id', user.id)`. RLS `Business updates own account` policy allows this — no Route Handler needed. Mirrors consumer `ProfiiliClient` save pattern (`setSaved(true)` + timeout reset).
- **D-08**: Client component obtains `user.id` from `createBusinessBrowserClient().auth.getUser()` on mount (or can be passed from RSC via session). Save is triggered by a button click, optimistic "Tallennettu" feedback shown for 2.5s.

### Read-only account info display (BIZPRO-01)

- **D-09**: Top glass card shows: `company_name` as heading (`text-sm font-bold text-[#111111]`), auth email as subtitle (`text-[rgba(17,17,17,0.45)] text-sm`), 'Yritystili' as a small badge (`text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 rounded-full px-2 py-0.5`). All fields are non-interactive (no inputs).
- **D-10**: Page layout (top to bottom): read-only account card → editable phone card → language toggle card → sign-out button. Sign-out at the bottom of the page, less prominent (hard to tap accidentally vs top placement).

### Language toggle (BIZPRO-03)

- **D-11**: Reuse `app/actions/locale.ts` `changeLocaleAction` verbatim — same Server Action as consumer `/profiili`. Call via `useTransition` + `router.refresh()` after setting cookie. No new code needed for the locale mechanism itself.

### Sign-out (BIZPRO-04)

- **D-12**: `createBusinessBrowserClient().auth.signOut()` then `router.push('/business/kirjaudu')` — identical to Phase 41 D-15. Consumer session (`sb-*`) unaffected.

### i18n

- **D-13**: Add profile-specific keys to the existing `Business` namespace in `messages/fi.json` and `messages/en.json`. No new namespace. Keys needed: `profileTitle`, `profileCompanyName`, `profileEmail`, `profileAccountType`, `profilePhone`, `profilePhonePlaceholder`, `profileSave`, `profileSaved`, `profileSaveError`, `profileLanguage`, `profileSignOut`.

### Claude's Discretion

- Exact `pt-16` vs `pt-20` on `<main>` — follow the Phase 42 D-06 value (`pt-16`) unless content is visually clipped under BusinessNav
- Whether the phone card and sign-out button are inside a single outer wrapper or standalone glass cards — separate cards per section (language parity with consumer `/profiili`)
- Error handling for save failure: `text-sm text-red-600` inline below the save button (same as consumer profiili `saveError` pattern)
- Loading skeleton while RSC data arrives: the RSC pattern avoids client-side loading; if any client-side fetch is needed (user.id), show a minimal spinner consistent with `app/business/page.tsx` spinner style

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — BIZPRO-01, BIZPRO-02, BIZPRO-03, BIZPRO-04 (Phase 43 scope)
- `.planning/ROADMAP.md` §Phase 43 — Goal, success criteria, UI hint

### Database schema
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_accounts` table: current columns (`user_id`, `company_name`, `approval_status`, `created_at`), RLS policies (SELECT/INSERT/UPDATE for `auth.uid() = user_id`)
- New migration (to be written): adds `contact_phone TEXT NULLABLE` to `business_accounts`

### Auth architecture
- `.planning/phases/39-auth-separaatio/39-CONTEXT.md` — `createBusinessServerClient()` / `createBusinessBrowserClient()` separation; middleware guards
- `lib/supabase-business.ts` — Business client factories: `createBusinessServerClient(cookies())` in RSC, `createBusinessBrowserClient()` in client

### Language toggle
- `app/actions/locale.ts` — `changeLocaleAction('fi' | 'en')` Server Action: sets `NEXT_LOCALE` cookie (httpOnly, 1 year, path=/). Reuse verbatim.
- `app/profiili/ProfiiliClient.tsx` — Full reference implementation for language toggle: `useTransition` + `startTransition(async () => { await changeLocaleAction(next); router.refresh() })`. Mirror exactly.

### Design system and patterns
- `app/globals.css` — `.glass`, `.glass-btn` utility classes
- `CLAUDE.md` — Design guidelines: color tokens, card structure, typography, animation principles

### Sign-out pattern
- `.planning/phases/41-navigation-foundation/41-CONTEXT.md` — D-15: `createBusinessBrowserClient().auth.signOut()` + `router.push('/business/kirjaudu')`
- `app/components/BusinessNav.tsx` — Existing sign-out implementation to mirror

### Existing code to mirror
- `app/profiili/ProfiiliClient.tsx` — Consumer profile page: glass card structure, save pattern (`setSaved` + timeout), `saveError` display, language toggle via `useTransition` + `changeLocaleAction`
- `app/business/page.tsx` — Business dashboard: glass card structure, loading spinner, `createBusinessBrowserClient()` usage pattern
- `app/business/map/page.tsx` — RSC pattern for business routes (server-side fetch + client props hand-off)

### i18n
- `messages/fi.json` §Business — Existing Business namespace keys; profile keys to be added
- `messages/en.json` §Business — English equivalents

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/actions/locale.ts` — `changeLocaleAction` Server Action. Drop-in reuse — no changes needed.
- `lib/supabase-business.ts` — `createBusinessBrowserClient()` for client-side save + sign-out; `createBusinessServerClient(cookies())` for RSC data fetch.
- `app/components/BusinessNav.tsx` — Already rendered by `app/business/layout.tsx`; `/business/profiili` gets it automatically. Sign-out pattern to mirror.

### Established Patterns
- **RSC + client split**: `app/business/map/page.tsx` + `app/business/map/BusinessMapClient.tsx` — RSC fetches server-side, passes props to client. Exact pattern for `profiili/page.tsx` + `profiili/BusinessProfiiliClient.tsx`.
- **Direct browser client save**: `app/profiili/ProfiiliClient.tsx` `handleSave()` — browser supabase client `.from('profiles').upsert(...)`. Mirror for `business_accounts` phone update (use `.update()` not `.upsert()` since the row always exists for a business user).
- **`pt-16` main padding**: `app/business/page.tsx` uses `pt-16 px-4 pb-24` — follow this for BusinessProfiiliClient's `<main>` to clear fixed BusinessNav.
- **Save feedback**: `setSaved(true)` → `text-sm text-green-700` inline message → `setTimeout(() => setSaved(false), 2500)` — same as consumer profiili.
- **Glass card sections**: `<div className="glass rounded-2xl p-4 flex flex-col gap-3">` with `<label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">` — from consumer profiili; use same structure.

### Integration Points
- `app/business/layout.tsx` → BusinessNav already rendered; `/business/profiili` inherits it automatically
- `app/business/profiili/page.tsx` → new RSC; creates the route
- New migration → adds `contact_phone` to `business_accounts`; RSC reads it; client updates it
- `messages/fi.json` + `messages/en.json` → add Business.profileTitle etc. keys

</code_context>

<specifics>
## Specific Ideas

- Phone number field is specifically for admin-to-user contact, not public-facing venue contact info. This framing is useful for the UI label: e.g., "Yhteysnumero (admin-käyttöön)" or simply "Puhelinnumero".
- 'Yritystili' badge on the read-only card communicates account type at a glance. Use `bg-green-100 text-green-700` (consistent with approved status badges elsewhere in the business UI).
- Sign-out button at the very bottom — a plain outlined pill button or underlined text link, not a destructive red button. "Kirjaudu ulos" is not a destructive action.

</specifics>

<deferred>
## Deferred Ideas

- `contact_email` and `contact_website` on `/business/profiili` — BIZPRO-02 was scoped down to phone only. If needed in the future, the same pattern (new columns + glass card inputs) applies.
- Admin-facing display of `contact_phone` in the admin approval panel — future admin phase.
- Supabase auth email change (login email update) — complex (requires re-verification), out of scope for Phase 43.

</deferred>

---

*Phase: 43-business-profile*
*Context gathered: 2026-06-15*
