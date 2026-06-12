---
phase: 42-dashboard-map
reviewed: 2026-06-12T12:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - app/business/page.tsx
  - app/business/map/page.tsx
  - messages/fi.json
  - messages/en.json
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 42: Code Review Report

**Reviewed:** 2026-06-12T12:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 42 adds a dashboard redesign (`app/business/page.tsx`) with `StatusCard` / `VenueRow` helpers and a `handleReapply` flow, plus a new `/business/map` route (`app/business/map/page.tsx`) that renders a full-screen Google Map with `SportPin` markers, a Kaikki/Omat toggle, and a `PaikkaSheet` on tap. Two i18n files receive new keys.

The implementation is generally well-structured and follows project conventions. Three critical issues were found: an authentication gap that lets unauthenticated users reach the map page, an unsafe cast that will crash the preview modal when `liikuntapaikat` is `null`, and a wrong `onboarding_draft` query column that can permanently trap a multi-venue user in a redirect loop. Four warnings cover unhandled error states, a silent auth failure, an unused i18n key, and a wrong `MAP_ID` env var name.

---

## Critical Issues

### CR-01: `/business/map` has no authentication gate — any visitor can load it

**File:** `app/business/map/page.tsx:116-159`

**Issue:** `BusinessMapPage` calls `createBrowserSupabase()` and conditionally fetches the business's own venue IDs only when `user` is truthy, but it does not redirect unauthenticated users away. An unauthenticated visitor (or someone whose session has expired) reaches the full map view, sees all published venues, and the Omat-filter silently shows nothing. More critically, none of the sibling business pages (e.g. `app/business/page.tsx`) guard against this at the route level, but the dashboard page does have an explicit `if (!user) { setLoading(false); return }` that renders nothing — the map page has no such guard and returns real UI.

Compare the dashboard's `checkState` (line 174) which short-circuits before rendering when there is no session, versus `BusinessMapPage`'s `load()` (line 133-141) which simply skips the second fetch and allows the render to proceed.

**Fix:**
```tsx
// In BusinessMapPage, after the two fetches resolve, check for a user before rendering:
useEffect(() => {
  async function load() {
    const bizSb = createBusinessBrowserClient()
    const { data: { user } } = await bizSb.auth.getUser()
    if (!user) {
      router.replace('/business/login')
      return
    }
    // ... existing fetch logic
  }
  load()
}, [router])
```

---

### CR-02: `onPreview` called with `null` `liikuntapaikat` crashes PreviewModal

**File:** `app/business/page.tsx:129`

**Issue:** The `VenueRow` preview button passes `link.liikuntapaikat as unknown as Liikuntapaikka` directly to `onPreview` (which sets `previewPaikka`). The `VenueLiikuntapaikka` join column is typed `VenueLiikuntapaikka | null` (line 37). When Supabase returns a row with no joined venue (e.g. the underlying `liikuntapaikat` row was deleted after the link was created, or the join returns null for any other reason), `link.liikuntapaikat` is `null`. That null value is cast away with `as unknown as Liikuntapaikka` and passed to `PreviewModal`, which immediately accesses `paikka.nimi`, `paikka.laji`, etc. — crashing with "Cannot read properties of null".

The same `null` can propagate through `PreviewModal` → `PaikkaKortti` / `DiagonaalKortti` / `PaikkaSheet`, all of which assume non-null.

**Fix:**
```tsx
// Guard in VenueRow before calling onPreview:
<button
  type="button"
  onClick={() => {
    if (link.liikuntapaikat) {
      onPreview(link.liikuntapaikat as unknown as Liikuntapaikka)
    }
  }}
  // disable the button when the venue data is unavailable
  disabled={!link.liikuntapaikat}
  className="..."
>
  {t('esikatseluCta')}
</button>
```

---

### CR-03: `onboarding_draft` redirect query uses wrong column — multi-venue users are trapped

**File:** `app/business/page.tsx:190-199`

**Issue:** The draft check queries `onboarding_draft` with `.eq('business_account_id', user.id)`. But the `save-step` route (confirmed in `app/api/business/onboarding/save-step/route.ts:104`) stores the draft using the conflict target `(business_account_id, paikka_id)`, meaning there can be *multiple* draft rows for the same business, keyed by both `business_account_id` and `paikka_id`.

The `.maybeSingle()` call returns at most one row. If a user has previously completed onboarding for one venue and currently has a draft for a second venue, the query may or may not return a row depending on database ordering — a non-deterministic redirect. More critically, if a completed draft was NOT deleted by the `submit` route (or was left over due to a partial failure), the user will be permanently redirected to `/business/onboarding` even though they have approved venues, and will never see the dashboard.

The `submit` route (line 111 of `submit/route.ts`) deletes the draft with `.eq('business_account_id', user.id)` (not scoped to a paikka_id), which may delete *all* drafts, potentially wiping in-progress drafts for other venues. This is a systemic schema / query mismatch.

The immediate fix for the dashboard page is to narrow the query to only active/incomplete drafts if a `status` column exists, or to at minimum prevent `.maybeSingle()` from throwing when there are multiple rows by switching to `.limit(1)` and checking `data.length > 0`:

**Fix:**
```tsx
// Use limit(1) to avoid "multiple rows returned" error from maybeSingle() and
// make the intent explicit: any draft causes a redirect.
const { data: drafts } = await supabase
  .from('onboarding_draft')
  .select('id')
  .eq('business_account_id', user.id)
  .limit(1)

if (drafts && drafts.length > 0) {
  router.push('/business/onboarding')
  return
}
```

The root fix requires deciding whether `onboarding_draft` should have one row per business or one per (business, venue), and making the `submit` delete and this query consistent.

---

## Warnings

### WR-01: Supabase query errors silently ignored throughout `checkState` and `load()`

**File:** `app/business/page.tsx:172-212` and `app/business/map/page.tsx:121-144`

**Issue:** Every Supabase query in `checkState` destructures only `data`, discarding `error`. If Supabase returns an error (network failure, RLS denial, schema change), the component silently sets empty state or null without showing an error to the user. In `BusinessMapPage.load()`, if the main venues fetch fails, `setAllVenues([])` is called implicitly (line 130: `(data as Liikuntapaikka[]) ?? []`), showing a blank map with no indication of failure.

In `checkState`, a failed `business_accounts` lookup sets neither `account` nor an error path, causing `setIsNotBusinessAccount(true)` — incorrectly showing the "not a business account" screen to a legitimate business user who is experiencing a transient network error.

**Fix:** Destructure `error` from each query result and render an error state or at minimum `console.error` to make failures observable:
```tsx
const { data: account, error: accountError } = await supabase
  .from('business_accounts')
  ...
if (accountError) {
  console.error('[business] account lookup failed', accountError)
  setLoading(false) // show a generic error, not "not a business account"
  return
}
```

---

### WR-02: `handleReapply` uses `getSession()` instead of `getUser()` — stale token risk

**File:** `app/business/page.tsx:217`

**Issue:** `handleReapply` calls `supabase.auth.getSession()` to obtain the bearer token sent to `/api/business/reapply`. The Supabase SSR documentation explicitly states that `getSession()` returns the session from local storage without re-validating with the server, and that it "should only be used for non-authenticated pages". For an authenticated action that hits an API route, `getUser()` should be used because it makes a network call to verify the JWT. If the user's session is expired or was revoked server-side, `getSession()` will still return a stale access token, and the API route's `supabaseAdmin.auth.getUser(token)` will reject it with a 401 — resulting in a silent error logged only to `console.error` (line 236) with no user-facing feedback.

**Fix:**
```tsx
async function handleReapply(paikkaId: number) {
  const supabase = createBusinessBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Surface an error to the user — session expired
    return
  }
  // getSession() is safe after getUser() confirms the session is valid
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  ...
}
```
Alternatively, add a visible error state when `res.ok` is false instead of only logging to console.

---

### WR-03: `MAP_ID` in `/business/map/page.tsx` uses the wrong env var name

**File:** `app/business/map/page.tsx:15`

**Issue:** The map page reads `process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (the old single-var name). Phase 07 migrated `Etusivu.tsx` to `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` (confirmed in the phase 07 VERIFICATION doc and `Etusivu.tsx` lines 20-21). The `.env.local.example` only documents the `_DAY` / `_NIGHT` variants; the plain `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` key is only in old planning docs.

In production, `MAP_ID` will be `undefined`, and `AdvancedMarker` requires a Map ID to render — without it, markers will not appear and the Google Maps JS SDK may log console errors.

**Fix:**
```tsx
// Match the day/night pattern from Etusivu.tsx, or use the day variant as a
// sensible default for this business-facing map (business hours, no dark mode toggle):
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY
```

---

### WR-04: `mapLoadingVenues` i18n key is defined but never used

**File:** `messages/fi.json:235`, `messages/en.json:235`

**Issue:** Both locale files define `Business.mapLoadingVenues` ("Ladataan paikkoja..." / "Loading venues..."). A search across all source files in `app/` shows zero usages of this key. The loading state in `BusinessMapPage` (line 146-151) renders a hardcoded spinner with no text, not this key. The key is dead i18n weight.

**Fix:** Either use the key in the loading spinner in `BusinessMapPage`:
```tsx
<main className="min-h-screen bg-white flex items-center justify-center gap-3">
  <div className="w-6 h-6 rounded-full border-2 ..." />
  <span className="text-sm text-[rgba(17,17,17,0.45)]">{t('mapLoadingVenues')}</span>
</main>
```
or remove the key from both locale files.

---

## Info

### IN-01: `VenueRow` "Muokkaa" link uses string concatenation instead of template literal

**File:** `app/business/page.tsx:135`

**Issue:** `href={'/business/' + link.paikka_id}` uses string concatenation. The rest of the codebase uses template literals for URL construction. Minor inconsistency, no functional impact.

**Fix:**
```tsx
href={`/business/${link.paikka_id}`}
```

---

### IN-02: `RecenterButton` renders visibly but does nothing when `coords` is null

**File:** `app/business/map/page.tsx:18-30`

**Issue:** When `userCoords` is null (geolocation denied or not yet resolved), `RecenterButton` is still rendered and fully interactive — clicking it does nothing because of the `if (map && coords)` guard. The button has no disabled state and no visual indication to the user that it is non-functional. This is consistent with how it is done in `Etusivu.tsx`, but it is a UX gap worth noting.

**Fix:** Add `disabled={!coords}` and an appropriate opacity to signal the inactive state:
```tsx
<motion.button
  ...
  disabled={!coords}
  className="... disabled:opacity-40 disabled:cursor-not-allowed"
>
```

---

_Reviewed: 2026-06-12T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
