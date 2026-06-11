# Phase 39: Business User UX - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Three of the four BIZUX requirements are implemented in this phase. BIZUX-02 (auto-redirect from `/`) is explicitly deferred — see Deferred Ideas.

1. **BIZUX-03** — "Avaa kartta" button added to the existing `/business` dashboard (`app/business/page.tsx`). The dashboard already has status badges, preview, and edit shortcuts; only the map button is missing.
2. **BIZUX-04** — New standalone `/business/map` route. Full-screen map with all directory venues, a top-bar pill toggle to switch to "my venues only", and PaikkaSheet on pin tap. No main pull-up bottom sheet, no AI widget, no weather section, no TODO overlay.
3. **BIZUX-05** — `/profiili` hides "Kiinnostuksen kohteet" and "Kotikaupunki" sections for business users. Detected via one extra `business_accounts` query in `ProfiiliClient.tsx`. Sections hidden silently — no replacement content. Language selector and sign-out remain unchanged.

</domain>

<decisions>
## Implementation Decisions

### Dashboard (BIZUX-03)
- **D-01:** Add a single "Avaa kartta" button to `app/business/page.tsx` that links to `/business/map`. Button placement: in the venue list section, below the venue rows or as a standalone action — planner decides exact position.
- **D-02:** All existing "Takaisin hakemistoon" (back to home) links on business pages link to `/business`, NOT to `/`. (This was clarified during the redirect discussion — avoids looping if BIZUX-02 is ever implemented.)

### /business/map (BIZUX-04)
- **D-03:** New standalone route at `app/business/map/page.tsx` (RSC). Does NOT reuse or modify `Etusivu.tsx`. Etusivu is 1713 lines — extracting from it is out of scope.
- **D-04:** RSC fetches two datasets server-side and passes as props to a client component:
  1. All published venues (`liikuntapaikat` WHERE `published = true`) — same query as `app/page.tsx`
  2. The current user's linked `paikka_id` list (`business_paikka_links` WHERE `business_account_id = user.id`) — for the "my venues" toggle filter
- **D-05:** Client component (`BusinessMapView` or similar) renders a full-screen Google Map with AdvancedMarkers. Uses the same map pattern as Etusivu (AdvancedMarker, `@vis.gl/react-google-maps`).
- **D-06:** Top-bar pill toggle: "Kaikki paikat" (default) vs "Omat paikat". Toggling filters the visible pins client-side using the pre-fetched `myPaikkaIds` set. No re-fetch needed.
- **D-07:** Pin tap opens `PaikkaSheet` — the same component used in Etusivu. This is normal behavior; the phase only removes the main pull-up bottom sheet (Karuselli + AI widget + weather + card list).
- **D-08:** No Karuselli, no AI widget, no weather fetch, no TODO overlay, no search bar, no filter pills.
- **D-09:** `/business/map` is automatically protected by `app/business/layout.tsx` RSC guard (BIZUX-01, Phase 37) — no additional auth needed.

### /profiili business detection (BIZUX-05)
- **D-10:** `ProfiiliClient.tsx` queries `business_accounts` once during `loadProfile` (alongside the existing `profiles` query). Sets a `isBusiness` boolean in state.
- **D-11:** When `isBusiness === true`, the "Kiinnostuksen kohteet" section and "Kotikaupunki" section are not rendered. No replacement content — they simply disappear.
- **D-12:** Language selector and sign-out button remain unchanged for business users.

### BIZUX-02 — Deferred
- **D-13:** BIZUX-02 (auto-redirect from `/` to `/business`) is NOT implemented in this phase. The right solution is a separate-auth architecture (distinct login sessions for business vs consumer). A band-aid RSC redirect would conflict with consumer browsing and require a bypass mechanism. Deferred to a future phase.

### Claude's Discretion
- Exact position of "Avaa kartta" button within the business dashboard layout
- Name of the new client component for the map (`BusinessMapView`, `BusinessKartta`, etc.)
- Whether the top-bar pill toggle uses the existing `glass-btn` utility class or a custom pill style
- GPS auto-center behavior on `/business/map` (follow Etusivu pattern: auto-request on mount)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — BIZUX-03, BIZUX-04, BIZUX-05 (Phase 39); BIZUX-02 deferred
- `.planning/ROADMAP.md` §Phase 39 — Success criteria and phase goal

### Files being modified
- `app/business/page.tsx` — add "Avaa kartta" button (BIZUX-03); update any "back" links from `/` to `/business`
- `app/profiili/ProfiiliClient.tsx` — add `isBusiness` detection via `business_accounts` query; conditionally hide two sections (BIZUX-05)

### New files
- `app/business/map/page.tsx` — RSC wrapper; fetches all venues + user's paikka_ids, passes to client component (BIZUX-04)
- `app/components/BusinessMapView.tsx` (or similar) — client component; full-screen Google Map, toggle, PaikkaSheet on tap (BIZUX-04)

### Existing patterns to follow
- `app/page.tsx` — SELECT pattern for fetching all published venues (copy this query)
- `app/components/Etusivu.tsx` — Google Maps + AdvancedMarker pattern (read for map setup, GPS, pin rendering). Do NOT modify.
- `app/components/PaikkaSheet.tsx` — import and wire up for pin tap in BusinessMapView
- `app/business/layout.tsx` — RSC auth guard already protects all `/business/*` routes; no extra auth in map route
- `lib/supabaseSSR.ts` — `createServerSupabase()` for RSC data fetching; `createBrowserSupabase()` in ProfiiliClient

### i18n
- `messages/fi.json` and `messages/en.json` — new strings needed: "Avaa kartta" button label (Business namespace), toggle labels ("Kaikki paikat" / "Omat paikat"), possibly a page title for `/business/map`

### Prior phase context
- `.planning/phases/37-tech-debt-foundation/37-CONTEXT.md` — BIZUX-01 RSC layout guard pattern
- `.planning/phases/36-hallintapaneeli/36-CONTEXT.md` — business dashboard structure and existing venue list

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/PaikkaSheet.tsx` — wire directly into BusinessMapView for pin tap; same props as Etusivu usage
- `app/business/page.tsx` — the `VenueLink` type and venue list rendering are reusable reference for "my venues" pin highlighting
- `lib/supabaseSSR.ts` `createBrowserSupabase()` — ProfiiliClient already uses this for `profiles` query; same client for `business_accounts` query

### Established Patterns
- **RSC data fetch → client component props:** `app/page.tsx` → `<Etusivu paikat={data} />` — copy this structure for `app/business/map/page.tsx` → `<BusinessMapView paikat={data} myPaikkaIds={ids} />`
- **Google Maps setup:** `app/components/Etusivu.tsx` uses `APIProvider` + `Map` + `AdvancedMarker` from `@vis.gl/react-google-maps` — BusinessMapView follows same imports
- **Toggle pills:** filter pills in Etusivu use `glass-btn` + active state `bg-[#111111] text-white` — same pattern for "Kaikki / Omat" toggle

### Integration Points
- `app/business/map/page.tsx` sits under `app/business/` — automatically wrapped by `app/business/layout.tsx` RSC auth guard
- BusinessMapView needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (already available client-side)
- ProfiiliClient already has `userId` and `createBrowserSupabase()` in scope when `loadProfile` runs — add `business_accounts` query there

</code_context>

<specifics>
## Specific Ideas

- "Avaa kartta" button on the business dashboard → `/business/map` (direct link, no JS needed)
- Toggle labels: "Kaikki paikat" (all venues, default) and "Omat paikat" (filtered to user's linked venues)
- "My venues" filter: `myPaikkaIds` is a `Set<number>` built from `business_paikka_links` paikka_ids; pin rendering checks `myPaikkaIds.has(paikka.id)` to highlight or filter
- When "Omat paikat" is active and the business has 0 approved/published venues, show a simple empty state message

</specifics>

<deferred>
## Deferred Ideas

- **BIZUX-02 — Auto-redirect from `/`:** Deferred. The user wants a proper separate-auth architecture where business and consumer logins are distinct sessions (separate login flows for `/business` vs `/`). A simple RSC redirect would require a bypass mechanism and could conflict with consumer browsing. This is a Phase 40+ architectural change.

</deferred>

---

*Phase: 39-business-user-ux*
*Context gathered: 2026-06-11*
