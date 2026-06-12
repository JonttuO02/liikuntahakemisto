# Phase 42: Dashboard & Map - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two new surfaces for business users:

1. **Redesigned `/business` dashboard** — account-level status card (from `business_accounts.approval_status`) + venue list with per-venue status badges + quick-action link to `/business/map`. Requires a new DB migration adding `rejection_reason` to `business_accounts`.
2. **New `/business/map` route** — standalone full-screen map (does NOT touch `Etusivu.tsx`) with SportPin markers, PaikkaSheet on tap, and a top-center pill toggle switching between "Kaikki paikat" (all published venues) and "Omat paikat" (business's own venues).

Requirements addressed: BIZUX-03, BIZUX-04.

</domain>

<decisions>
## Implementation Decisions

### Account status card (BIZUX-03)

- **D-01:** The dashboard status card shows `business_accounts.approval_status` — an **account-level** status (`pending` / `approved` / `rejected`). This is separate from per-venue `claim_status` in `business_paikka_links`, which continues to be shown per-venue in the venue list below.
- **D-02:** A new migration adds a nullable `rejection_reason TEXT` column to `business_accounts`. The status card shows the reason if non-null. Admin panel is NOT updated in Phase 42 — admin sets it via Supabase Studio until a dedicated admin phase.
- **D-03:** The status card includes a reapply CTA when `approval_status === 'rejected'`.

### Dashboard layout

- **D-04:** Minimal layout change — keep the existing centered glass card layout. Add the account status card as a new section at the **top** of the glass card, before the venue list.
- **D-05:** Add a `/business/map` quick-action link **inside the glass card**, below the venue list and above existing "Add venue" / "Back to home" actions. A simple text link or outlined pill button is sufficient.
- **D-06:** Add top padding to `<main>` (e.g. `pt-16`) to ensure content clears the fixed BusinessNav elements (brand text top-left, pill top-right).

### Dashboard architecture

- **D-07:** Convert `app/business/page.tsx` to **RSC + client split**:
  - RSC wrapper (`app/business/page.tsx`) fetches `business_accounts` (approval_status, rejection_reason) + `business_paikka_links` server-side using `createBusinessServerClient()`, passes as props.
  - New `app/business/BusinessDashboardClient.tsx` (client component) receives data as props and handles all interactivity: add venue toggle, reapply CTA, preview modal, onboarding draft redirect.

### Business map implementation (BIZUX-04)

- **D-08:** `/business/map` is a **lean standalone** implementation — new `app/business/map/page.tsx` (RSC) + `app/business/map/BusinessMapClient.tsx` (client). Does NOT modify `Etusivu.tsx`. Uses the same deps: `@vis.gl/react-google-maps`, `SportPin`, `PaikkaSheet`, `Supercluster`.
- **D-09:** RSC (`app/business/map/page.tsx`) fetches all `published=true` venues server-side (same query as `app/page.tsx`) and passes to the client component as props.
- **D-10:** Pill toggle "Kaikki paikat" / "Omat paikat" is positioned **fixed top-center** on the map, z-index below BusinessNav (< 64) but above the map tiles. Client component holds toggle state.
- **D-11:** "Kaikki paikat" = all `published=true` venues (same scope as Etusivu — all cities).
- **D-12:** "Omat paikat" = filter the already-loaded venue list to those linked to the current business account. The RSC also fetches the user's `business_paikka_links` (paikka_id list) and passes it to the client for client-side filtering — no second network call when toggling.

### Claude's Discretion

- **Account reapply mechanism**: Follow the same pattern as venue reapply in the existing dashboard — POST to a new Route Handler `/api/business/account-reapply` with a Bearer token; the handler sets `business_accounts.approval_status = 'pending'` via `supabaseAdmin`. Optimistically update the UI on success (same as existing venue reapply).
- **Status card visual**: A `.glass rounded-2xl` section at the top of the dashboard card with a status badge (same color classes as the venue list badges: `bg-amber-100 text-amber-700` for pending, `bg-green-100 text-green-700` for approved, `bg-red-50 text-red-600` for rejected).
- **BusinessMapClient GPS**: Include a recenter button (same `Locate` icon + `glass-btn rounded-full` pattern from Etusivu) — GPS auto-centers on mount using `useGPS`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — BIZUX-03 (dashboard), BIZUX-04 (/business/map)
- `.planning/ROADMAP.md` §Phase 42 — Goal, success criteria, UI hint

### Database schema
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_accounts` table: `user_id`, `company_name`, `approval_status` CHECK; `business_paikka_links` table: `claim_status`, `link_type`
- `supabase/migrations/20260611000001_approval_trigger.sql` — approval trigger for venue publish atomicity (Phase 38 pattern — reference when writing account reapply Route Handler)

### Auth architecture
- `.planning/phases/39-auth-separaatio/39-CONTEXT.md` — `createBusinessServerClient()` / `createBusinessBrowserClient()` separation; middleware guards
- `lib/supabase-business.ts` — Business client factories (use `createBusinessServerClient(cookies())` in RSC, `createBusinessBrowserClient()` in client components)

### Design system and patterns
- `app/globals.css` — `.glass`, `.glass-btn` utility classes
- `CLAUDE.md` — Design guidelines: color tokens, card structure, animation principles

### Existing code to reuse / mirror
- `app/page.tsx` — Server-side venue fetch pattern (RSC fetching `published=true` liikuntapaikat, passing to client component as props)
- `app/business/page.tsx` — Current dashboard client component (being refactored — read for existing query patterns and state logic)
- `app/components/BusinessNav.tsx` — Fixed positioning z-index (64); the top-center toggle on /business/map must use z-index < 64
- `app/components/SportPin.tsx` — Map pin component (reuse on /business/map)
- `app/components/PaikkaSheet.tsx` — Venue detail sheet (reuse on /business/map; opened on pin tap)
- `app/components/Etusivu.tsx` — Map setup reference: `MapPanController`, `RecenterButton`, `Supercluster` usage, `useGPS` hook integration, `Map` + `AdvancedMarker` from `@vis.gl/react-google-maps`. READ for patterns; do NOT modify this file.
- `app/api/business/reapply/route.ts` — Venue reapply Route Handler (mirror this pattern for the new account-reapply Route Handler)
- `.planning/phases/41-navigation-foundation/41-CONTEXT.md` — BusinessNav decisions (D-01 through D-15); sign-out pattern; RSC redirect pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/SportPin.tsx` — Drop-in map marker with sport icon + color from `lib/lajit.ts`. Reuse directly on /business/map.
- `app/components/PaikkaSheet.tsx` — Venue detail bottom sheet. Same component used in Etusivu — import and reuse on /business/map.
- `hooks/useGPS.ts` — GPS hook (auto-requests on mount, returns `{ coords, error }`). Reuse for map centering on /business/map.
- `app/api/business/reapply/route.ts` — Existing venue reapply endpoint — mirror for `/api/business/account-reapply`.

### Established Patterns
- **RSC server-fetch + client props**: `app/page.tsx` fetches venues server-side and passes to `Etusivu`. Mirror this for both `/business/page.tsx` and `/business/map/page.tsx`.
- **Client component data via props**: Avoid client-side data fetching for initial data — RSC handles it. Client components only fetch for interactive actions (reapply CTA, add venue).
- **Fixed overlay z-index**: BusinessNav is at z-index 64. Any overlays on /business/map (pill toggle, recenter button) must use z-index < 64 to stay below the nav.
- **Status badge colors**: `bg-amber-100 text-amber-700` (pending), `bg-green-100 text-green-700` (approved), `bg-red-50 text-red-600` (rejected) — already used in current page.tsx venue list.
- **Supercluster**: Used in Etusivu for pin clustering. Re-use the same pattern on /business/map.

### Integration Points
- `app/business/layout.tsx` → renders BusinessNav; /business/map will be inside this layout and get BusinessNav automatically
- `app/business/page.tsx` → being refactored to RSC + client split; the existing `useEffect` fetch logic moves into server-side queries + `BusinessDashboardClient.tsx`
- New migration: adds `rejection_reason TEXT` (nullable) to `business_accounts`
- New Route Handler: `app/api/business/account-reapply/route.ts`

</code_context>

<specifics>
## Specific Ideas

- The account status card is visually similar to the per-venue status badge row already in the page — same color tokens, same `.glass rounded-2xl` surface, same `text-[10px] font-bold uppercase tracking-widest` badge style.
- "Kaikki paikat" / "Omat paikat" toggle: a two-option pill toggle (similar to filter pills in Etusivu) fixed at `top: max(60px, calc(env(safe-area-inset-top) + 48px))` to clear the BusinessNav brand text.
- `/business/map` has no consumer toolbar (no search, no sport filter, no AI widget) — it's a clean map view with only the toggle and a recenter button.

</specifics>

<deferred>
## Deferred Ideas

- Admin panel update to set `business_accounts.rejection_reason` — deferred past Phase 42; admin uses Supabase Studio in the meantime.
- Dashboard analytics (visit counts, sheet opens per venue) — future milestone.
- Multi-venue account management (ketjuadmin) — future milestone.

</deferred>

---

*Phase: 42-dashboard-map*
*Context gathered: 2026-06-12*
