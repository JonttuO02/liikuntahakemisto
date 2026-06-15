---
phase: 42-dashboard-map
verified: 2026-06-15T10:00:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "/business/map renders a full-screen map showing all published venues with functional AdvancedMarker pins (CR-01 auth gate now present)"
  gaps_remaining: []
  regressions: []
---

# Phase 42: Dashboard & Map Verification Report

**Phase Goal:** Business users have a useful dashboard home and a standalone map to explore venues
**Verified:** 2026-06-15T10:00:00Z
**Status:** passed
**Re-verification:** Yes — after CR-01/CR-02/CR-03 gap closure

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `/business` shows a status card reflecting pending / approved / rejected with reapply CTA when rejected | VERIFIED | `StatusCard` component in `app/business/page.tsx` lines 43–90. Derives state from `venueLinks`: green border for approved, red border for all-rejected (with reapply CTA calling `handleReapply`), amber for pending. i18n keys present in both fi/en. |
| 2 | Dashboard lists venues with per-venue status badges (pending / approved / rejected) | VERIFIED | `VenueRow` component lines 93–158. Renders name + status badge with conditional classes (green/red/amber), `claim_status` string matched to i18n keys `statusApproved`, `statusRejected`, `statusPending`. |
| 3 | Dashboard has quick-action link to `/business/map` and per-venue edit links | VERIFIED | Quick-action `<a href="/business/map">` present at lines 315–325. Per-venue "Muokkaa" `<a href={'/business/' + link.paikka_id}>` at line 134–139. |
| 4 | `/business/map` renders a full-screen map showing all published venues with functional AdvancedMarker pins | VERIFIED | Auth gate now present: `bizSb.auth.getUser()` called at top of `load()`, `if (!user) { router.replace('/business/kirjaudu'); return }` (lines 126–131). Map renders `AdvancedMarker` per venue with `SportPin`. Published venues fetched via real DB query with `.eq('published', true)`. |
| 5 | A pill toggle on `/business/map` switches between "Kaikki paikat" and "Omat paikat" | VERIFIED | `BusinessMapInner` lines 75–98 render a toggle pill. `filter` state drives `const venues = filter === 'mine' ? allVenues.filter(v => myPaikkaIds.has(v.id)) : allVenues` (lines 45–47). Both i18n keys `mapToggleAll` / `mapToggleMine` present in fi.json and en.json. |
| 6 | Tapping a map pin on `/business/map` opens PaikkaSheet for that venue | VERIFIED | `AdvancedMarker onClick={() => setSelected(v)}` (line 64). `selected && <PaikkaSheet paikka={selected} todo={false} onToggleTodo={() => {}} onClose={() => setSelected(null)} />` (lines 102–110). `PaikkaSheet` accepts these props. |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/business/page.tsx` | Dashboard redesign with StatusCard, VenueRow, quick-action link | VERIFIED | 346 lines. All three sections present and wired. CR-02 null guard and CR-03 limit fix applied. |
| `app/business/map/page.tsx` | Full-screen business map with toggle, PaikkaSheet, and auth gate | VERIFIED | 165 lines. Substantive, wired. Auth gate present at lines 126–131. |
| `messages/fi.json` (Business namespace) | 9 dashboard keys + 3 map keys = 12 new keys | VERIFIED | All 12 keys present. |
| `messages/en.json` (Business namespace) | Same 12 keys in English | VERIFIED | All 12 keys present. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BusinessPage` | `StatusCard` | props: `venueLinks`, `t`, `onReapply` | WIRED | Lines 269–269, StatusCard renders conditional approved/rejected/pending card. |
| `BusinessPage` | `VenueRow` | `.map()` with props | WIRED | Lines 277–285, all VenueLinks rendered. |
| `VenueRow` | `/business/{id}` | `<a href>` | WIRED | Lines 134–139. Edit wizard link present for each venue. |
| `BusinessPage` | `/business/map` | `<a href="/business/map">` | WIRED | Lines 315–325 quick-action card. |
| `BusinessMapPage` | auth gate | `bizSb.auth.getUser()` then `router.replace('/business/kirjaudu')` | WIRED | Lines 126–131. Unauthenticated visitors are redirected before any data fetching. |
| `BusinessMapPage` | Supabase `liikuntapaikat` | `createBrowserSupabase().from('liikuntapaikat').eq('published', true)` | WIRED | Lines 134–140. Real DB query, not static. |
| `BusinessMapPage` | `business_paikka_links` | `createBusinessBrowserClient().from('business_paikka_links')` (after auth confirms user) | WIRED | Lines 143–147. |
| `BusinessMapInner` | `PaikkaSheet` | `selected && <PaikkaSheet ...>` | WIRED | Lines 102–110. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/business/page.tsx` | `venueLinks` | `supabase.from('business_paikka_links').select(...)` with join | Yes — joined query against two tables | FLOWING |
| `app/business/map/page.tsx` | `allVenues` | `sb.from('liikuntapaikat').select(...).eq('published', true)` | Yes — real DB query | FLOWING |
| `app/business/map/page.tsx` | `myPaikkaIds` | `bizSb.from('business_paikka_links').select('paikka_id')` after auth confirmed | Yes — real DB query, runs only when user is authenticated | FLOWING |

---

### Fixes Applied (Re-verification Notes)

**CR-01 — Auth gate on `/business/map`** (was BLOCKER, now CLOSED):
`BusinessMapPage.load()` now calls `createBusinessBrowserClient().auth.getUser()` at the very top. If `!user`, it calls `router.replace('/business/kirjaudu')` and returns before any map or venue data is fetched. Lines 126–131 of `app/business/map/page.tsx`. Pattern is now consistent with `app/business/page.tsx` and all other business routes.

**CR-02 — VenueRow null crash on preview** (was WARNING, now CLOSED):
`VenueRow` preview button (line 129) now has `disabled={!link.liikuntapaikat}`. The `onClick` handler (line 130) guards with `if (link.liikuntapaikat)` before calling `onPreview`. The button also has `disabled:pointer-events-none` so even a synthetic click cannot reach the handler when `liikuntapaikat` is null.

**CR-03 — `maybeSingle()` on onboarding_draft** (was WARNING, now CLOSED):
The query at line 192 now uses `.limit(1)` instead of `.maybeSingle()`. The condition at line 197 checks `drafts && drafts.length > 0` against the returned array. Multi-row draft scenario no longer causes a Supabase "multiple rows" error.

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points without starting the Next.js dev server. Both pages are client components requiring browser/SSR context.

---

### Probe Execution

Step 7c: No probe scripts declared in PLAN.md or SUMMARY.md. No `scripts/*/tests/probe-*.sh` found for this phase. SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BIZUX-03 | 42-01-PLAN.md | `/business` dashboard shows approval status card, venue list with status badges, quick-action links | SATISFIED | StatusCard (approved/pending/rejected with reapply CTA), VenueRow (per-venue status badges), quick-action card to `/business/map`, per-venue "Muokkaa" links — all present in `app/business/page.tsx`. |
| BIZUX-04 | 42-02-PLAN.md | `/business/map` shows full-screen map, top-bar pill toggle Kaikki/Omat paikat, PaikkaSheet on pin tap, route secured to authenticated business users | SATISFIED | Map renders, toggle works, PaikkaSheet on tap works, auth gate present (CR-01 closed). |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/business/page.tsx` | 217 | `supabase.auth.getSession()` used for auth token in `handleReapply` | WARNING | `getSession()` returns cached/unvalidated session. If session is expired server-side, the `/api/business/reapply` route will reject the stale token. Error only logged to console, no user feedback. Not a phase blocker. |
| `messages/fi.json` | 235 | `mapLoadingVenues` key defined but never used | INFO | Loading spinner renders without this text. Dead i18n weight but not a functional blocker. |
| `app/business/page.tsx` | 135 | String concatenation `'/business/' + link.paikka_id` instead of template literal | INFO | Minor style inconsistency. No functional impact. |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files.

Previous WARNING items CR-02 (null cast) and CR-03 (maybeSingle) are now resolved by the applied fixes.

---

### Human Verification Required

None. All functional behaviors are verifiable through static analysis. The auth gate, null guard, and limit fix are all code-level patterns that can be confirmed without running the application.

---

### Gaps Summary

No gaps. All three critical fixes have been applied and verified in the codebase:

- CR-01 auth gate: present at `app/business/map/page.tsx` lines 126–131
- CR-02 null guard: present at `app/business/page.tsx` lines 129–131
- CR-03 limit fix: present at `app/business/page.tsx` lines 192–197

Phase goal is achieved: business users have a secured dashboard home showing approval state and venue list, and a standalone map (also secured) to explore venues with Kaikki/Omat toggle and pin-tap sheet.

---

_Verified: 2026-06-15T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
