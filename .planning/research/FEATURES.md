# Feature Landscape — v1.8 Dual-Mode UX & Business Publication

**Domain:** Sports venue directory with dual consumer/business portal (AKTIIVI)
**Researched:** 2026-06-11
**Milestone:** v1.8 Yritysportaali v2 — Julkistaminen & UX

---

## Context: What Already Exists in v1.7

- `business_accounts` + `business_paikka_links` tables with RLS
- `published` boolean on `liikuntapaikat` (new venues start `published=false`, existing start `true`)
- `is_claimed` boolean on `liikuntapaikat` (set to `true` when any claim/create is submitted)
- `business_managed` boolean guards Places sync script from overwriting managed venues
- `/business` management panel with venue list, edit wizard, preview modal
- `/admin` panel for approve/reject with email notifications
- 6-step onboarding wizard with draft persistence in `onboarding_draft` table
- Middleware (`middleware.ts`) currently only refreshes the Supabase session cookie — no role-based routing
- `/business` page does **client-side** role detection via `useEffect` + `business_accounts` query
- `/admin` page does **client-side** auth guard via `useEffect + router.replace('/')` — not server-side

---

## Table Stakes

Features users expect in each category. Missing = product feels broken or incomplete.

### 1. Role Detection and Routing at App Level

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Business user lands on `/business` dashboard instead of consumer map at `/` | Every dual-mode SaaS (Airbnb host/guest switch, Google Business Profile, Foursquare for Business) routes role-appropriate home on login. A business user landing on the consumer map and having to manually navigate to their panel feels broken. | Medium | Middleware reads `business_accounts` existence for authenticated users hitting `/`; redirects to `/business`. One extra DB query only on `/` for authenticated users — acceptable. |
| Business redirect happens server-side, not via `useEffect` | Client-side redirect causes a flash of the consumer map before redirect fires. This is the current `/business` page pattern — it works but produces a blank loading state | Medium | Extend `middleware.ts` to include a `/` path check with `business_accounts` lookup |
| Consumer users are never redirected to `/business` | Consumers have nothing to do there; seeing it would be confusing or alarming | Low | Already guarded — `/business` checks `business_accounts` table and shows a "register" CTA |
| Auth state fully resolved before redirect decision | User should not see flash of wrong content, then redirect | Medium | Middleware runs server-side before any render — this is the correct architectural layer |
| Logout from business context returns to consumer home | After sign-out the user is no longer a business user; `/business` would just redirect them away | Low | Existing sign-out flow already navigates to `/` — no change needed |

**Confidence: HIGH** — Airbnb's documented "Switch to hosting/traveling" flow and Next.js middleware role routing are both well-documented. The existing `middleware.ts` already calls `supabase.auth.getUser()` on every request; the extension is a known pattern.

### 2. Business Dashboard UX

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Approval status per venue, clearly labeled | A business needs to know at a glance whether they are live, waiting, or rejected — without hunting | Low | Already rendered in `/business` venue list with color-coded badges. Needs clear header copy for the "pending" state to explain what waiting means. |
| Quick action to edit venue | Primary recurring action after approval | Low | Already exists as "Muokkaa" link to `/business/[id]` |
| Pending state communicates expected timeline | Businesses anxiety-check during review | Low | Add explanatory copy: "Hakemus odottaa tarkistusta, saat sähköpostin kun se on käsitelty" |
| Rejection reason visible with re-apply CTA | Without a reason, re-apply is guesswork; business has no idea what to fix | Low | Already implemented in `/business` — `rejection_reason` column shown with "Hae uudelleen" button |
| "Add another venue" action prominent | Multi-venue businesses (gym chains, sports clubs) are a core segment | Low | Already implemented as "+ Lisää paikka" toggle. Needs to be more prominently placed in the dashboard layout. |
| Navigation back to consumer view | Business users are also consumers; they want to see the map, find venues near theirs | Low | A "Avaa kartta" or "Näytä hakemisto" link from the dashboard |
| Business profile page (not consumer profile) | `/profiili` currently shows `kotikaupunki` and `kiinnostukset` — irrelevant fields for a business account | Medium | Detect business account on `/profiili`, render company info (company_name) instead of consumer interests/hometown fields |

**Confidence: HIGH** — Validated against both existing v1.7 code and standard SaaS patterns (Tripadvisor Management Centre, Foursquare Business Listings dashboard). Most pieces exist; the gap is UX framing and the profile page adaptation.

### 3. "Verified/Managed" Listing Indicators

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visual badge or checkmark next to venue name for claimed/approved venues | Google Business Profile (blue checkmark), Yelp (claimed badge + shield for verified licenses), Foursquare, Tripadvisor — all use this pattern. Consumers expect it in any serious directory. | Low | Render conditionally when `is_claimed=true` in `PaikkaKortti`, `DiagonaalKortti`, and `PaikkaSheet`. `is_claimed` is already in the schema and in the `liikuntapaikat` SELECT. |
| Indicator visible wherever the venue appears | Trust signal must appear in card list, map sheet, and any preview | Low | Three render targets: `PaikkaKortti` (card name row), `DiagonaalKortti` (card name row), `PaikkaSheet` (hero/header section) |
| Indicator is visually distinct from "Sponsoroitu" | Amber is already reserved for sponsored content. Verification must use a different visual token or it creates confusion | Low | Use indigo (`text-indigo-600`) with a `BadgeCheck` or `CheckCircle` Lucide icon at 12px — aligns with AKTIIVI's indigo brand color |
| Indicator does NOT appear for unmanaged venues | False trust signals would be worse than no signals | Low | Read `is_claimed` — only `true` when a business has submitted a claim/create. Admin approval is separate; indicator appears at claim time, not approval time. |
| "Managed by owner" tooltip or label on hover | Power users want to understand what the checkmark means | Low | `title` attribute or a brief tooltip: "Paikan omistaja ylläpitää tietoja" |

**Confidence: HIGH** — Universal directory pattern. Yelp research shows claimed/verified badges increase engagement by ~10%. `is_claimed` column already exists in schema and is already queried by `app/page.tsx`.

### 4. Business Data Publication Flow

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Admin approval triggers `published=true` on `liikuntapaikat` | Core contract: admin approval = venue becomes visible to consumers | Low | Extend the existing `/api/admin/approve` Route Handler to additionally set `published=true`. Currently only sets `claim_status='approved'`. |
| Business-entered data syncs to `liikuntapaikat` on approval | Business provided their own images, pricing, hours, description, contact info through onboarding. This data must replace the auto-scraped Google Places fallback data. Without this step, the venue goes live but shows stale auto-populated data. | Medium | Read onboarding data from source tables (business_paikka_links fields / onboarding_draft data or directly from liikuntapaikat columns already written by wizard). Build UPDATE for `liikuntapaikat`. |
| `business_managed=true` set on approval | Existing column; prevents sync script from later overwriting the business-entered data with Google Places auto-scrape | Low | Set in same DB transaction as `published=true` in the approve handler |
| Field-level fallback: if business left a field empty, keep existing data | Not all businesses fill every field. A missing phone number should not overwrite a valid phone number that was auto-populated. | Medium | Field-level null-check before overwrite: only `UPDATE liikuntapaikat SET col=val WHERE id=X` for non-null, non-empty business fields. |
| Rejection does NOT publish | Rejected venues must stay `published=false` | Low | Approve handler already gates on `claim_status`. Reject handler does not touch `published`. No change needed. |
| Re-approval after rejection republishes | Business fixes issues, resubmits, gets approved again — same outcome | Low | Same approval code path handles both first-time and re-approval. No separate logic needed. |
| Photo and logo URLs sync from Storage on approval | `photo_urls` and `logo_url` were uploaded to Supabase Storage during onboarding. They are written to the `liikuntapaikat` record but need to be confirmed live-ready on approval. | Medium | Confirm `image_url`, `logo_url`, `photo_urls` are written to `liikuntapaikat` as part of approval. These columns exist (added in v1.7 migrations). |

**Confidence: HIGH** — Migration files confirm the column structure (`published`, `business_managed`, `is_claimed`, `photo_urls`, `logo_url`, `image_url`). The `/api/admin/approve` endpoint exists from v1.7. The data sync extension is the concrete gap.

---

## Differentiators

Features that set this product apart from a bare-minimum implementation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Business dashboard as the real homepage (not a `/business` redirect) | Feels intentional, not bolted-on. Business users get their primary experience immediately, with no visible client-side detection delay. | Medium | Requires server-side middleware role check. Replaces current `useEffect`-based detection in `/business`. |
| Consumer map accessible from business dashboard in stripped mode | Business users are also consumers. They want to explore the map, find venues near theirs, test the discovery experience. But they should not see consumer-only features (AI widget, bookmarks, bottomsheet reviews). | Medium | Add `businessMode?: boolean` prop to `Etusivu`. When `true`: hide AI weather widget, hide bookmark button, hide bottomsheet review prompt. GPS and map pins remain fully functional. Do NOT create a separate route — that would duplicate the map codebase. |
| `/profiili` shows business context for business users | Profile page currently shows `kotikaupunki` and `kiinnostukset` — irrelevant for a business. A business profile page should show company name, approval status, link to `/business`. | Medium | Check `business_accounts` in `ProfiiliClient` or server-side in `/profiili/page.tsx`. Render a business-specific section instead of consumer interests. |
| Verified checkmark in all three venue card formats simultaneously | PaikkaKortti + DiagonaalKortti + PaikkaSheet all show the indicator. Consistent trust signal regardless of where you encounter the venue. | Low | Three small changes, each low complexity. High visible impact. |

**Confidence: MEDIUM** — Airbnb's server-driven dual-mode architecture confirms this is the right approach at scale. The stripped-map pattern is specific to this app; complexity estimate is based on reading `Etusivu.tsx` (large component but prop-threaded patterns already exist).

---

## Anti-Features

Features to explicitly NOT build in v1.8.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Separate `/map` route for business users | Creates a second map codebase to maintain. GPS, clustering, pin logic, zoom behavior would duplicate. Guaranteed to diverge. | Pass `businessMode` prop to `Etusivu`; conditionally hide consumer widgets |
| Re-approval flow for every edit | Would create excessive friction for minor pricing/hours updates. v1.7 explicitly decided: only first claim needs admin approval. Edits in edit wizard apply immediately. | Keep v1.7 decision: edits are immediate, no re-approval |
| "Switch mode" toggle for business users on the map | Adds cognitive overhead — a business user switching to "consumer mode" to use the map they occasionally want to browse is unnecessary UX complexity | Simple "Avaa kartta" button from the dashboard is sufficient |
| Verified checkmark as a paid feature | Yelp monetized this; BrightLocal research documented user trust erosion as a result. Verification should be the natural reward for admin approval, not a premium feature. | Free for all approved venues as part of the publication flow |
| Google Places conflict-resolution UI for overlapping data | Extremely complex UX for a v1.8 scope. Business data should simply win at approval time with no UI needed. | Field-level null-check: business value wins if non-empty; otherwise keep existing auto-populated value |
| Analytics dashboard on `/business` | No meaningful data yet. Premature optimization. | Defer to a future milestone when venues have accumulated visits/review data |
| Re-send approval email button for admin | Low value; Resend email infra works correctly; admins can use Supabase directly if needed | Not needed |

---

## Feature Dependencies

```
Middleware server-side role routing
  requires: business_accounts table (exists v1.7)
  required by: business-dashboard-as-homepage UX
  required by: /profiili business variant (can share same check)

Publication on approval
  requires: /api/admin/approve (exists v1.7, needs extension)
  requires: business_managed=true column (exists v1.7)
  requires: published=false for new venues (exists v1.7, enforced at create time)
  required by: verified checkmark appearing on published+claimed venues

Verified checkmark in cards
  requires: is_claimed=true in liikuntapaikat (exists v1.7, set at claim/create time)
  requires: published=true (gated by publication flow)
  requires: is_claimed added to SELECT in app/page.tsx (may need to verify it's included)
  required by: consumer trust signal

Consumer map in business dashboard (stripped mode)
  requires: middleware routing (business lands on /business first, has "Avaa kartta" button)
  requires: businessMode prop in Etusivu
  independent of: publication flow

/profiili business variant
  requires: business_accounts check (server or client side)
  independent of: publication flow
  independent of: middleware routing (nice to have but not blocked by it)
```

---

## Tech Debt Items (v1.8 scope, not new features)

| Item | What It Is | Complexity | Why Now |
|------|-----------|------------|---------|
| Wizard orchestration refactor | Shared step-navigation logic between `OnboardingWizardInner` and `EditWizardInner` is currently duplicated. Step state, URL sync, prev/next handlers repeat. | Medium | Reduces bug surface before v1.8 adds more wizard interactions |
| Claim route `business_managed=true` fix | When a business claims an existing venue (`/api/business/claim-paikka`), `business_managed` should be set to `true` immediately — not only on admin approval. The sync script checks this flag to skip managed venues. If not set at claim time, a sync during the pending period could overwrite business-entered data. | Low | Data integrity fix; 1-line change in the claim Route Handler |
| `/admin` Next.js middleware protection | `app/admin/page.tsx` uses `useEffect + router.replace('/')` client-side guard. This causes a blank flash for unauthorized users; worse, the page briefly renders before redirect for fast connections. Server-side protection via middleware is the correct pattern. | Low | Security/UX fix; extends the same middleware that will handle business user routing |
| `onboarding_completed` cleanup | If a `onboarding_completed` boolean exists on `business_accounts`, it is redundant with the `onboarding_draft` table (which is the authoritative "is onboarding in progress" source). The column creates confusion about the source of truth. | Low | Schema hygiene; prevents future bugs where both signals are checked inconsistently |

**Confidence: HIGH** — All items confirmed by direct code inspection of `middleware.ts`, `app/admin/page.tsx`, and the migration files.

---

## Implementation Notes for Roadmap Planning

### Middleware Role Check (performance consideration)
The existing `middleware.ts` runs `supabase.auth.getUser()` on every request. Adding a `business_accounts` lookup would add one extra DB round-trip, but ONLY for:
- Authenticated users (unauthenticated users skip it)
- Hitting the `/` path (no reason to check on `/paikat/[id]`, `/profiili`, etc.)

Pattern: `if (request.nextUrl.pathname === '/' && user) { check business_accounts; if found, redirect to /business }`. This is a minimal, targeted extension.

Alternative: Store business account existence in a JWT custom claim or cookie at login time to avoid the DB round-trip entirely. However, this requires a database webhook or login trigger to populate the claim — added complexity. For v1.8, the single targeted DB query on `/` is simpler and sufficient.

### Data Sync on Approval
The approve endpoint (`/api/admin/approve`) must be extended to:
1. Fetch the `paikka_id` from `business_paikka_links` for the application being approved
2. Read current business-entered data already in `liikuntapaikat` (images, pricing, hours, contact info were written by the onboarding wizard via edit wizard pattern)
3. Build an UPDATE that sets `published=true`, `business_managed=true` (and only overwrites other fields if they are non-null in the current row — since the wizard already wrote them, they should be present)
4. Execute as a single atomic update

The onboarding wizard in v1.7 writes data directly to `liikuntapaikat` rows during the wizard steps (confirmed by the edit wizard pattern in `app/business/[id]/EditWizardInner.tsx`). So approval does not need to "copy" data from a separate draft — it just needs to flip `published` and `business_managed`.

### Verified Checkmark Token
Project design system: amber is already reserved for "Sponsoroitu". Indigo aligns with the AKTIIVI brand (NavBar is `bg-indigo-800`, hero is `bg-indigo-600`). Use `text-indigo-600` with a `BadgeCheck` Lucide icon at `w-3 h-3` or `w-3.5 h-3.5`. Avoid blue (used for map pins). The indicator renders inline next to the venue name in the card name row.

### Stripped Map for Business Users
`Etusivu.tsx` is a large component (~900 lines). Do not fork it. Add a `businessMode?: boolean` prop. Gate the following elements behind `!businessMode`:
- AI weather widget (`SaaWidget` / AI recommendations section)
- Bookmark button (`BookmarkButton` component)
- Bottomsheet review/rating prompts
- The "Kirjaudu" nav button (business is already logged in)

GPS, map pins, search, filters, and bottomsheet venue info should all remain functional — business users legitimately want to find venues.

---

## MVP Recommendation

Recommended phase order for v1.8:

1. **Tech debt** — wizard refactor, claim `business_managed` fix, admin middleware protection, `onboarding_completed` cleanup. Low risk, sets clean foundation.
2. **Publication on approval** — extend `/api/admin/approve` to set `published=true` + `business_managed=true`. Core value delivery of v1.8.
3. **Verified checkmark** — add `is_claimed` to `PaikkaKortti`, `DiagonaalKortti`, `PaikkaSheet`. Visual payoff, depends only on #2 for the approved venues case (though `is_claimed=true` is already set at claim time).
4. **Business dashboard as homepage** — middleware role routing + "Avaa kartta" button on dashboard + stripped consumer map.
5. **Profile page business variant** — `/profiili` hides consumer fields for business users. Lower priority, but important for the cohesive business experience.

**Defer to future milestone:**
- Analytics/metrics on business dashboard (no data yet)
- Business notification email when listing goes live (email infra exists but adds scope)
- Paid "Sponsoroitu" upgrade flow for businesses

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Role detection / middleware routing | HIGH | Next.js middleware pattern well-documented; existing middleware is the right extension point; confirmed by Next.js docs and GitHub discussions |
| Business dashboard table stakes | HIGH | Most already built in v1.7; gaps confirmed by code inspection of `app/business/page.tsx` |
| Verified indicator | HIGH | `is_claimed` column exists and is in schema; visual token pattern is industry-standard |
| Publication data sync | HIGH | Column structure confirmed in migrations; approve endpoint exists; extension is well-scoped |
| Stripped map for business | MEDIUM | `Etusivu.tsx` is large; prop threading is the right approach but needs care; not a documented external pattern — estimation based on code reading |
| Tech debt items | HIGH | All four items confirmed by direct code inspection |

---

## Sources

- Codebase: `app/business/page.tsx`, `app/admin/page.tsx`, `middleware.ts`, `supabase/migrations/20260605000000_business_accounts.sql`, `supabase/migrations/20260605000001_business_managed.sql`, `supabase/migrations/20260605000004_published_is_claimed.sql`
- Airbnb dual-mode switching: [Switching between hosting and traveling](https://www.airbnb.com/help/article/3546)
- Next.js middleware role routing: [Role-based routing discussion](https://github.com/vercel/next.js/discussions/23041), [Next.js Middleware docs](https://nextjs.org/docs/14/app/building-your-application/routing/middleware)
- Google Business Profile verification: [Verify your business on Google](https://support.google.com/business/answer/7107242?hl=en), [Understand Google updates to your profile](https://support.google.com/business/answer/3480441)
- Yelp claimed vs verified: [What is a claimed business?](https://www.yelp-support.com/article/What-is-a-claimed-business?l=en_US), [Is Yelp monetizing trust with verified badge?](https://www.brightlocal.com/blog/is-yelp-monetizing-consumer-trust-with-its-new-verified-badge/)
- Tripadvisor Management Centre: [Quick Start Guide](https://www.tripadvisor.co.uk/TripAdvisorInsights/w746)
- Foursquare Business Listings: [foursquare.com/products/business-listings/](https://foursquare.com/products/business-listings/)
- Directorist claim listing: [Moderating Claims](https://directorist.com/documentation/extensions/claim-listing/moderating-claims/)
