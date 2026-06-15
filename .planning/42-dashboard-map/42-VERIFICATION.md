---
phase: 42-dashboard-map
verified: 2026-06-12T14:00:00Z
status: gaps_found
score: 5/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "/business/map renders a full-screen map showing all published venues with functional AdvancedMarker pins"
    status: failed
    reason: "MAP_ID reads NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID which is the correct env var (same one used by Etusivu.tsx — Phase 07 did NOT migrate to _DAY/_NIGHT in the actual codebase, contradicting the review). However, CR-01 is real: BusinessMapPage has no auth redirect — unauthenticated users reach the full map UI. The business layout.tsx contains no auth guard; individual page.tsx files are expected to guard themselves. BusinessMapPage.load() skips the biz-session fetch silently but renders the full map regardless of auth state."
    artifacts:
      - path: "app/business/map/page.tsx"
        issue: "No redirect when user is unauthenticated. load() checks user only to decide whether to fetch myPaikkaIds — it does not call router.replace('/business/kirjaudu') when user is null. The full map renders for any visitor."
    missing:
      - "Add auth check at the top of load(): fetch user via createBusinessBrowserClient, if !user call router.replace('/business/kirjaudu') and return"
---

# Phase 42: Dashboard & Map Verification Report

**Phase Goal:** Business users have a useful dashboard home and a standalone map to explore venues
**Verified:** 2026-06-12T14:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `/business` shows a status card reflecting pending / approved / rejected with reapply CTA when rejected | VERIFIED | `StatusCard` component in `app/business/page.tsx` lines 43–90. Derives state from `venueLinks`: green border for approved, red border for all-rejected (with reapply CTA calling `handleReapply`), amber for pending. i18n keys present in both fi/en. |
| 2 | Dashboard lists venues with per-venue status badges (pending / approved / rejected) | VERIFIED | `VenueRow` component lines 93–158. Renders name + status badge with conditional classes (green/red/amber), `claim_status` string matched to i18n keys `statusApproved`, `statusRejected`, `statusPending`. |
| 3 | Dashboard has quick-action link to `/business/map` and per-venue edit links | VERIFIED | Quick-action `<a href="/business/map">` present at lines 315–325. Per-venue "Muokkaa" `<a href={'/business/' + link.paikka_id}>` at line 134–139. |
| 4 | `/business/map` renders a full-screen map showing all published venues | BLOCKER | File exists and is substantively implemented. Map renders `AdvancedMarker` per venue with `SportPin`. BUT: no auth gate — unauthenticated visitors reach the map and see all published venues. BusinessMapPage.load() does not redirect when `user` is null (line 134–141 of `app/business/map/page.tsx`). The business layout (`app/business/layout.tsx`) only adds `BusinessNav` — no auth guard. CR-01 is a real gap. |
| 5 | A pill toggle on `/business/map` switches between "Kaikki paikat" and "Omat paikat" | VERIFIED | `BusinessMapInner` lines 75–98 render a toggle pill. `filter` state drives `const venues = filter === 'mine' ? allVenues.filter(v => myPaikkaIds.has(v.id)) : allVenues` (lines 45–47). Both i18n keys `mapToggleAll` / `mapToggleMine` present in fi.json and en.json. |
| 6 | Tapping a map pin on `/business/map` opens PaikkaSheet for that venue | VERIFIED | `AdvancedMarker onClick={() => setSelected(v)}` (line 64). `selected && <PaikkaSheet paikka={selected} todo={false} onToggleTodo={() => {}} onClose={() => setSelected(null)} />` (lines 102–110). `PaikkaSheet` accepts these props (verified in `app/components/PaikkaSheet.tsx`). |

**Score:** 5/6 truths verified (SC-4 blocked by CR-01 auth gap)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/business/page.tsx` | Dashboard redesign with StatusCard, VenueRow, quick-action link | VERIFIED | 345 lines. All three sections present and wired. |
| `app/business/map/page.tsx` | Full-screen business map with toggle and PaikkaSheet | VERIFIED (with gap) | 159 lines. Substantive, wired. Auth gate missing. |
| `messages/fi.json` (Business namespace) | 9 dashboard keys + 3 map keys = 12 new keys | VERIFIED | All 12 keys present at lines 224–235: dashboardStatusPendingTitle/Body, dashboardStatusApprovedTitle/Body, dashboardStatusRejectedTitle/Body/BodyNoReason, dashboardMapCta, dashboardVenuesHeading, mapToggleAll, mapToggleMine, mapLoadingVenues. |
| `messages/en.json` (Business namespace) | Same 12 keys in English | VERIFIED | All 12 keys present at lines 224–235. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BusinessPage` | `StatusCard` | props: `venueLinks`, `t`, `onReapply` | WIRED | Lines 269–269, StatusCard renders conditional approved/rejected/pending card. |
| `BusinessPage` | `VenueRow` | `.map()` with props | WIRED | Lines 277–285, all VenueLinks rendered. |
| `VenueRow` | `/business/{id}` | `<a href>` | WIRED | Line 134–139. Edit wizard link present for each venue. |
| `BusinessPage` | `/business/map` | `<a href="/business/map">` | WIRED | Lines 315–325 quick-action card. |
| `BusinessMapPage` | Supabase `liikuntapaikat` | `createBrowserSupabase().from('liikuntapaikat').eq('published', true)` | WIRED | Lines 124–130. Real DB query, not static. |
| `BusinessMapPage` | `business_paikka_links` | `createBusinessBrowserClient().from('business_paikka_links')` (conditional on user) | WIRED | Lines 133–141. |
| `BusinessMapInner` | `PaikkaSheet` | `selected && <PaikkaSheet ...>` | WIRED | Lines 102–110. |
| `BusinessMapPage` | auth gate | `router.replace('/business/kirjaudu')` | NOT_WIRED | Missing — no redirect when user is null. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/business/page.tsx` | `venueLinks` | `supabase.from('business_paikka_links').select(...)` with join | Yes — joined query against two tables | FLOWING |
| `app/business/map/page.tsx` | `allVenues` | `sb.from('liikuntapaikat').select(...).eq('published', true)` | Yes — real DB query | FLOWING |
| `app/business/map/page.tsx` | `myPaikkaIds` | `bizSb.from('business_paikka_links').select('paikka_id')` | Yes — real DB query (conditional on auth) | FLOWING |

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
| BIZUX-04 | 42-02-PLAN.md | `/business/map` shows full-screen map, top-bar pill toggle Kaikki/Omat paikat, PaikkaSheet on pin tap | PARTIALLY SATISFIED | Map renders, toggle works, PaikkaSheet on tap works. Gap: unauthenticated visitors can access the page (CR-01 auth gate missing). The core BIZUX-04 feature set is present but the route is not secured. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/business/page.tsx` | 129 | `link.liikuntapaikat as unknown as Liikuntapaikka` — null cast without guard | WARNING | `VenueLiikuntapaikka | null` type can be null (e.g. if joined row is deleted). Passed directly to `onPreview` → `setPreviewPaikka` → `PreviewModal` which accesses `paikka.nimi`, `paikka.laji` etc. Crash risk if venue row is missing. |
| `app/business/page.tsx` | 190–194 | `.maybeSingle()` on `onboarding_draft` which can have multiple rows per business | WARNING | If a business has more than one draft row, `maybeSingle()` may throw "JSON object requested, multiple (or no) rows returned" from Supabase, causing `checkState` to silently fail and lock the user out. |
| `app/business/page.tsx` | 217 | `supabase.auth.getSession()` used for auth token in `handleReapply` | WARNING | `getSession()` returns cached/unvalidated session. If session is expired server-side, API call sends a stale token that the `/api/business/reapply` route will reject. Error only logged to console, no user feedback. |
| `app/business/map/page.tsx` | 15 | `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` env var | INFO | The review (CR-03/WR-03) claimed this should be `_DAY`/`_NIGHT`, but actual `Etusivu.tsx` line 32 and `.env.local.example` line 12 both use the plain `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` form. The review finding is INCORRECT for the actual codebase state. This is consistent with existing production code. Not a real issue. |
| `messages/fi.json` | 235 | `mapLoadingVenues` key defined but never used | INFO | Loading spinner renders without this text. Dead i18n weight but not a functional blocker. |
| `app/business/page.tsx` | 135 | String concatenation `'/business/' + link.paikka_id` instead of template literal | INFO | Minor style inconsistency. No functional impact. |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files.

---

### Human Verification Required

None. All functional behaviors are verifiable through static analysis. CR-01 (auth gate) is a clear code-level gap, not a UX judgment call.

---

### Gaps Summary

**1 gap blocking full phase goal achievement.**

**Gap — CR-01: `/business/map` has no authentication gate**

`BusinessMapPage` in `app/business/map/page.tsx` renders the full map UI regardless of session state. The `load()` function checks for a user only to decide whether to fetch `myPaikkaIds` — it does not redirect unauthenticated visitors away. The business layout (`app/business/layout.tsx`) provides only `BusinessNav`, no auth guard.

All other business pages implement their own guard: `app/business/page.tsx` line 174 returns early with `setLoading(false)` when `!user`. The map page omits this pattern entirely.

**Impact on success criteria:** SC-4 ("renders a full-screen map") is satisfied architecturally, but the route is publicly accessible — inconsistent with the security posture of every other business route. BIZUX-04 as stated in REQUIREMENTS.md requires the page to be part of the business-user-only section.

**Fix:** In `BusinessMapPage.load()`, fetch user first via `createBusinessBrowserClient().auth.getUser()`. If `!user`, call `router.replace('/business/kirjaudu')` and return before any other fetches.

**Not gaps (review findings that were incorrect or are warnings only):**

- **WR-03 / MAP_ID env var**: The review claimed `Etusivu.tsx` migrated to `_DAY`/`_NIGHT` — this is FALSE. Current `Etusivu.tsx` line 32 reads `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (same as the business map page). `.env.local.example` documents only the plain form. The business map uses the correct variable.
- **CR-02 (null liikuntapaikat crash)**: Real risk but requires a dangling foreign key (deleted venue record) to trigger. Not a day-1 blocker for the phase goal.
- **CR-03 (maybeSingle on onboarding_draft)**: Real data integrity concern for multi-venue users. Does not affect the dashboard render for typical single-venue users and does not block phase success criteria directly.

---

_Verified: 2026-06-12T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
