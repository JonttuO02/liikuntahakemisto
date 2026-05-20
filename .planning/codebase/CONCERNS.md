# Codebase Concerns

**Analysis Date:** 2026-05-20
**Phase context:** Phase 1 (Foundation & Security) complete. Phase 2 (Map & GPS) is next.

---

## Security Concerns

**`supabaseAdmin` client instantiated at module load — no env guard:**
- Risk: `lib/supabase.ts` line 11 uses `process.env.SUPABASE_SERVICE_ROLE_KEY!` with a non-null assertion. If the env var is absent in any deployment environment, the admin client is silently created with `undefined` as the key. All admin writes will fail at runtime with a confusing Supabase auth error rather than a clear "misconfiguration" message.
- Files: `lib/supabase.ts` (line 11)
- Current mitigation: API routes check `ADMIN_SECRET` presence before proceeding; no similar guard for the service role key itself
- Recommendations: Add a startup check `if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error(...)` or validate before the first admin call
- Severity: MEDIUM

**Anon key and Supabase URL are `NEXT_PUBLIC_` — exposed in client bundle:**
- Risk: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally public, but they are embedded in the client JS bundle. Anyone with the anon key can query the `liikuntapaikat` table directly, bypassing the app's API. RLS mitigates write risk, but bulk SELECT scraping is unrestricted.
- Files: `lib/supabase.ts` (lines 3–4), `app/page.tsx` (line 2), `app/paikat/[id]/page.tsx` (line 4)
- Current mitigation: RLS is enabled (Phase 1 complete); SELECT is intentionally public
- Recommendations: Rate limiting on the Supabase project for the anon key; acceptable as-is for a read-heavy public directory
- Severity: LOW

**No CSRF protection on admin route:**
- Risk: `/api/admin/sync-paikat` is protected by a static `Bearer` token in the `Authorization` header. The token is a shared secret (`ADMIN_SECRET` env var). There is no rotation mechanism, expiry, or audit log.
- Files: `app/api/admin/sync-paikat/route.ts` (lines 58–62), `app/api/hae-paikat/route.ts` (lines 58–62)
- Current mitigation: Token must be in the `Authorization` header — not a cookie, so standard CSRF attacks are not applicable. Risk is token leakage.
- Recommendations: Document token rotation procedure; consider adding request logging for admin endpoint calls
- Severity: LOW

**`varauslinkki` URLs rendered as raw hrefs with no validation:**
- Risk: The `varauslinkki` field is scraped from Google Places `website` data and stored in Supabase. It is rendered as an `<a href={varauslinkki}>` with `target="_blank" rel="noopener noreferrer"` in multiple places. If a venue's website field in Google Places is ever a non-https URL scheme, it could behave unexpectedly.
- Files: `app/components/Etusivu.tsx` (line 501), `app/components/PaikkaKortti.tsx` (line 78), `app/components/Kartta.tsx` (line 257), `app/paikat/[id]/page.tsx` (line 100)
- Current mitigation: `rel="noopener noreferrer"` is present on all external links; Google Places data is generally trustworthy
- Recommendations: Validate URL scheme on write (`https?://` only) in `app/api/admin/sync-paikat/route.ts` before upserting to Supabase
- Severity: LOW

---

## Performance Concerns

**Dual `useJsApiLoader` calls — root cause of double-load flash (Phase 2 requirement):**
- Problem: Both `app/components/Etusivu.tsx` (line 60) and `app/components/Kartta.tsx` (line 125) call `useJsApiLoader({ googleMapsApiKey: ... })` independently. The `@react-google-maps/api` library loads the Google Maps JS SDK lazily on first call. On the Etusivu homepage, both the preview map and the fullscreen map share the same hook instance internally, but the SDK load creates a visual flash when pins first render.
- Additionally, if a user navigates between views that mount different map components, a second `useJsApiLoader` instance initializes. Phase 2's success criterion 4 explicitly requires eliminating this double-load flash.
- Files: `app/components/Etusivu.tsx` (line 60), `app/components/Kartta.tsx` (line 125)
- Impact: Visible pin-render flash; poor first impression of map view
- Fix approach: Migrate to `@vis.gl/react-google-maps` with a single `<APIProvider>` in `app/layout.tsx`, replacing both `useJsApiLoader` calls. This is the Phase 2 library migration.
- Severity: HIGH (Phase 2 blocker per success criterion 4)

**All venue data fetched on every page load — no caching:**
- Problem: `app/page.tsx` (line 11) fetches all rows from `liikuntapaikat` on every request with no caching. `@supabase/supabase-js` uses its own HTTP client that does not participate in the Next.js fetch cache. Filtering (by `laji`) happens client-side in `LiikuntapaikatLista.tsx`.
- Files: `app/page.tsx` (lines 11–13)
- Impact: Every page request hits Supabase; at scale this consumes Supabase free tier row-read quota
- Fix approach: Wrap the Supabase query in `unstable_cache` from `next/cache` with a 5-minute revalidation period
- Severity: MEDIUM

**`Etusivu.tsx` mounts two `<GoogleMap>` instances simultaneously when fullscreen is open:**
- Problem: The Etusivu layout mounts the preview map (3D tilt widget) permanently and then mounts a second `<GoogleMap>` instance when `kartaAuki` becomes true (fullscreen). Both are live simultaneously during the fullscreen transition, each with their own DOM tree, event listeners, and pin sets. The preview map is never unmounted while fullscreen is open.
- Files: `app/components/Etusivu.tsx` (lines 265–297 preview map, lines 336–359 fullscreen map)
- Impact: Memory pressure, battery drain on mobile during fullscreen map use; two sets of markers rendered simultaneously
- Fix approach: Conditionally render the preview map only when `!kartaAuki`, or use a single map instance that transitions between states
- Severity: MEDIUM

**SVG marker icons generated per-render via `encodeURIComponent` — not memoized:**
- Problem: `Etusivu.tsx` `getMarkerIcon()` function (lines 147–164) generates a new SVG string and calls `encodeURIComponent()` on every render for every visible pin. With 20–50 venues, this runs 20–50 string encoding operations per render cycle. The function is not memoized.
- Files: `app/components/Etusivu.tsx` (lines 147–164)
- Impact: Minor CPU overhead; more significant on slow mobile devices with many pins
- Fix approach: Memoize per `(laji, isActive)` pair using a module-level cache Map keyed on `${laji}-${isActive}`
- Severity: LOW

**`open-meteo` weather fetch on every Etusivu mount — no cache:**
- Problem: `app/components/Etusivu.tsx` (lines 93–97) fetches current weather from `api.open-meteo.com` unconditionally in a `useEffect`. Every mount triggers a network request, even if the user navigated away and back within seconds.
- Files: `app/components/Etusivu.tsx` (lines 93–97)
- Impact: Unnecessary network requests; Open-Meteo has rate limits (10,000 req/day free tier)
- Fix approach: Cache the result in `sessionStorage` with a 10-minute TTL
- Severity: LOW

**`Karuselli.tsx` uses a `ResizeObserver` with no debounce:**
- Problem: `app/components/Karuselli.tsx` (lines 37–43) attaches a `ResizeObserver` that fires on every pixel change during window resize, causing frequent state updates and re-renders.
- Files: `app/components/Karuselli.tsx` (lines 37–43)
- Impact: Minor jank during window resize; not a concern on mobile where viewport width is stable
- Fix approach: Debounce the ResizeObserver callback with a 100ms delay
- Severity: LOW

---

## Technical Debt

**`app/components/Etusivu.tsx` is a 526-line monolithic client component:**
- Issue: `Etusivu.tsx` handles night/day mode, weather fetch, typewriter animation, carousel integration, preview map, fullscreen map expansion, marker rendering, filter pills, and bottom sheet — all in one file. The dedicated `Kartta.tsx` component exists but implements the map differently using `OverlayView` with animated pins, while Etusivu uses the legacy `<Marker>` component with SVG data URLs.
- Files: `app/components/Etusivu.tsx` (entire file), `app/components/Kartta.tsx` (entire file)
- Impact: Any map bug must be investigated across two implementations; the two marker systems diverge in capability and visual behavior
- Fix approach: Phase 2 map migration should standardize on a single map implementation; extract GPS logic into a `useGPS` hook
- Severity: MEDIUM

**`Etusivu.tsx` uses legacy `<Marker>` API; `Kartta.tsx` uses `<OverlayView>`:**
- Issue: Two different Google Maps marker approaches are used in the same codebase. `Etusivu.tsx` uses `<Marker>` with SVG `data:` URL icons (the legacy approach). `Kartta.tsx` uses `<OverlayView>` with React-rendered SVG pins and Framer Motion animations. The legacy `<Marker>` API will be removed in a future Google Maps JS SDK version.
- Files: `app/components/Etusivu.tsx` (lines 284, 352), `app/components/Kartta.tsx` (lines 37–122)
- Impact: Inconsistent pin visual behavior; the Etusivu markers lack hover labels that Kartta pins have
- Fix approach: Phase 2 library migration should standardize on `<AdvancedMarker>` from `@vis.gl/react-google-maps`
- Severity: MEDIUM

**`app/suosikit/page.tsx` is a permanent placeholder stub:**
- Issue: `app/suosikit/page.tsx` shows "Suosikkitoiminto on tulossa pian." (Coming soon). The BottomNav has a permanent tab for this route. No favorites functionality exists and no phase plans it.
- Files: `app/suosikit/page.tsx` (entire file), `app/components/BottomNav.tsx` (lines 37–44)
- Impact: BottomNav tab leads to a dead end; users on mobile see a prominent nav item that does nothing
- Fix approach: Implement localStorage-based favorites in a future phase, or hide the tab until the feature is ready
- Severity: MEDIUM

**`Karuselli.tsx` has hardcoded placeholder ad content — `ADS-01` requirement unmet in UI:**
- Issue: `app/components/Karuselli.tsx` (lines 12–17) has `MAINOKSET` hardcoded as `[{ id: '1', label: 'Mainos · A' }, ...]`. Phase 1 added the `featured boolean` column to Supabase for ad infrastructure (`ADS-01`), but the carousel does not read from Supabase. The carousel is purely decorative with placeholder text.
- Files: `app/components/Karuselli.tsx` (lines 12–17)
- Impact: Carousel occupies significant viewport space with no real content; `featured` column in Supabase is unused
- Fix approach: Connect carousel to `featured = true` venues from Supabase; or repurpose as a featured venue showcase
- Severity: MEDIUM

**`app/page.tsx` routing: `nakyma=kartta` renders `Etusivu`, not `Kartta.tsx`:**
- Issue: `app/page.tsx` (lines 26–38) checks `if (searchParams.nakyma === 'lista')` and returns `<LiikuntapaikatLista>`. The `nakyma=kartta` case falls through to the `else` which renders `<Etusivu>`. This means `Kartta.tsx` is currently unreachable — no page renders it. Etusivu has its own integrated map, but `Kartta.tsx` (282 lines) is dead code.
- Files: `app/page.tsx` (lines 26–39), `app/components/Kartta.tsx` (entire file)
- Impact: Phase 2 GPS work needs to decide which map component to enhance — the dead `Kartta.tsx` or the integrated Etusivu map
- Fix approach: Phase 2 should either wire `/?nakyma=kartta` to render `Kartta.tsx`, or remove `Kartta.tsx` and consolidate into Etusivu
- Severity: MEDIUM

**Duplicate `TAMPERE` coordinate constant defined in 4 files:**
- Issue: `const TAMPERE = { lat: 61.4978, lng: 23.761 }` is defined in `app/components/Etusivu.tsx` (line 16), `app/components/Kartta.tsx` (line 13), `app/api/hae-paikat/route.ts` (lines 5–6: `TAMPERE_LAT`/`TAMPERE_LNG`), and `app/api/admin/sync-paikat/route.ts` (lines 5–6).
- Files: Four files as listed above
- Impact: Coordinate must be updated in 4 places if ever changed
- Fix approach: Extract to `lib/constants.ts` or `lib/geo.ts`
- Severity: LOW

**`.gmap-pin` CSS classes in `globals.css` are unused dead code:**
- Issue: `app/globals.css` (lines 73–112) defines `.gmap-pin`, `.gmap-pin:hover`, `.gmap-pin[data-active="true"]`, and `.pin-label` CSS classes. Neither `Etusivu.tsx` nor `Kartta.tsx` use these class names — both use inline Framer Motion styles and `OverlayView`. These are leftover from an older implementation.
- Files: `app/globals.css` (lines 73–112)
- Impact: 40 lines of dead CSS; potential confusion for future developers
- Fix approach: Remove the unused `.gmap-pin` and `.pin-label` blocks
- Severity: LOW

**`getInfoWindowStyle` export in `lib/lajit.ts` is unused:**
- Issue: `lib/lajit.ts` exports `getInfoWindowStyle()` (lines 21–32). `Kartta.tsx` does not import or use this function — it uses `laji.color` directly from `lajiKonfig` for pin coloring. The function was added in Phase 1 (D-09) to replace an inline color map, but `Kartta.tsx`'s current implementation uses a bottom sheet, not an InfoWindow.
- Files: `lib/lajit.ts` (lines 21–32)
- Impact: Dead export; no functional bug
- Severity: LOW

---

## Scalability Concerns

**Places Text Search returns max 20 results — no pagination implemented:**
- Current capacity: `app/api/admin/sync-paikat/route.ts` runs a single Text Search (`liikuntapaikat Tampere`) that returns at most 20 results (Places API default page size). There is no `next_page_token` pagination.
- Limit: The database will never contain more than 20 venues from a single sync run. Phase 3 requires at least 7 sport categories, and many sport types will not appear in a single generic "liikuntapaikat Tampere" query.
- Files: `app/api/admin/sync-paikat/route.ts` (line 113: `results` array, no pagination)
- Fix approach: Add `pagetoken` pagination to fetch up to 60 results; add category-specific search queries (e.g., "kiipeilyhalli Tampere", "jääkiekkohalli Tampere")
- Severity: HIGH (data completeness blocker for Phase 3)

**`Promise.all` for Place Details — no concurrency limit:**
- Problem: Lines 120 in both API routes use `Promise.all(results.map(...))` to fetch Place Details for all 20 results concurrently. 20 simultaneous outbound HTTPS requests to Google may trigger rate limiting and delay the response until the slowest request completes.
- Files: `app/api/admin/sync-paikat/route.ts` (line 120), `app/api/hae-paikat/route.ts` (line 120)
- Fix approach: Use a concurrency-limited batch (chunks of 5) with a manual queue or `p-limit`
- Severity: LOW

**Supabase free tier limits:**
- Current capacity: Free tier allows 500 MB database storage, 5 GB bandwidth/month. At current dataset size (tens of venues), storage is not a concern.
- Limit: The fetch-on-every-request pattern (see Performance section) could consume row-read quota faster than expected at higher traffic
- Fix approach: Implement response caching as described in Performance concerns before launch
- Severity: LOW (current scale)

---

## Dependency Risks

**`@react-google-maps/api` v2.20.8 — community wrapper with known issues:**
- Risk: `@react-google-maps/api` is a community-maintained wrapper. It has known issues with React 18 Strict Mode double-invocation and does not support the new `AdvancedMarkerElement` API. The library's maintenance pace has slowed since 2023. The recommended modern alternative is `@vis.gl/react-google-maps` (maintained by the Google Maps team).
- Impact: Phase 2 success criterion 4 (eliminate double-load flash) requires addressing the dual `useJsApiLoader` problem; migrating to `@vis.gl/react-google-maps` with a single `<APIProvider>` is the cleanest solution.
- Files: `app/components/Etusivu.tsx` (line 6), `app/components/Kartta.tsx` (line 5)
- Migration plan: Replace `@react-google-maps/api` with `@vis.gl/react-google-maps`; wrap app in a single `<APIProvider>` at layout level; replace `<GoogleMap>` with `<Map>`, `<Marker>` with `<AdvancedMarker>`, `<OverlayView>` with `<AdvancedMarker>` custom content
- Severity: HIGH (Phase 2 migration required)

**`next` v14.2.35 — `searchParams` API changes in v15:**
- Risk: The project uses `next: 14.2.35`. In Next.js 15, `searchParams` in Server Components changed from a synchronous object to a Promise. An upgrade to v15 requires code changes in `app/page.tsx`.
- Files: `app/page.tsx` (line 9 — synchronous `searchParams` type)
- Migration plan: When upgrading to v15, add `await` to `searchParams` access and update type to `Promise<{ nakyma?: string }>`
- Severity: LOW (no immediate action required)

**`shadcn` v4.7.0 listed in `dependencies` instead of `devDependencies`:**
- Risk: `shadcn` is the shadcn/ui CLI tool, not a runtime library. Listed in `dependencies` causes it to be included in production deployments unnecessarily, adding to deployment size.
- Files: `package.json` (line 22)
- Fix approach: Move `"shadcn": "^4.7.0"` from `dependencies` to `devDependencies`
- Severity: LOW

---

## Known Bugs and Fragile Areas

**`Kartta.tsx` is dead code — unreachable from any active route:**
- What happens: `app/page.tsx` renders `<Etusivu>` for both the base `/` route and the `/?nakyma=kartta` route (only `nakyma === 'lista'` renders `<LiikuntapaikatLista>`). `Kartta.tsx` is not imported by any page or component that is rendered.
- Files: `app/page.tsx` (lines 26–38), `app/components/Kartta.tsx`
- Impact: 282 lines of functional map code that is untested and unreachable in production
- Workaround: Etusivu has its own fullscreen map. Phase 2 must decide: wire `/?nakyma=kartta` to `Kartta.tsx`, or remove `Kartta.tsx` and build GPS into Etusivu's map.
- Severity: MEDIUM

**`window.history.pushState` in `Etusivu.tsx` bypasses Next.js router:**
- What happens: `app/components/Etusivu.tsx` (lines 119–125) calls `window.history.pushState(null, '')` when `kartaAuki` becomes true, then listens to `popstate` to close the fullscreen map. This is a direct DOM history manipulation that bypasses Next.js's router state. On some browsers, pressing Back may leave the URL in an unexpected state or create duplicate history entries.
- Files: `app/components/Etusivu.tsx` (lines 119–125)
- Trigger: Open fullscreen map, press browser Back button
- Fix approach: Use `useRouter.push()` with a `?kartaAuki=1` param instead of raw `pushState`
- Severity: LOW

**`fullH` state initializes to hardcoded `600` — one-frame height jump on first open:**
- What happens: `app/components/Etusivu.tsx` line 54 initializes `fullH` to `600`. The `useEffect` (lines 83–90) recalculates it from `window.innerHeight` on mount. On devices where `innerHeight - NAV_H` differs from 600, there will be a one-frame height jump when the fullscreen map first opens.
- Files: `app/components/Etusivu.tsx` (lines 54, 83–90)
- Trigger: Open fullscreen map on a device with viewport height other than ~656px
- Severity: LOW

**Price filter in `LiikuntapaikatLista.tsx` is non-functional with current data:**
- What happens: `app/components/LiikuntapaikatLista.tsx` (lines 13–18, 37–38) implements a `hinta_max` filter. The filter condition is `hintaRef == null || hintaRef <= aktiivHinta` — null passes the filter. Since all synced venues have null `hinta_min` and `hinta_max`, selecting "≤10 €" still shows all venues rather than hiding them.
- Files: `app/components/LiikuntapaikatLista.tsx` (line 38)
- Trigger: Select any price filter in the list view
- Workaround: None — requires pricing data to be populated in Supabase
- Severity: LOW (data gap, not a code bug)

---

## Phase 2 Specific Risks

**GPS permission handling — 3 states, platform differences:**
- Risk: The Geolocation API has three permission states: `granted`, `denied`, `prompt`. Phase 2 success criterion 2 requires silent fallback to Tampere center if denied or unavailable. The `GeolocationPositionError` has 3 codes: 1 (PERMISSION_DENIED), 2 (POSITION_UNAVAILABLE), 3 (TIMEOUT). iOS Safari additionally requires HTTPS for geolocation.
- Constraint from CLAUDE.md: GPS must NEVER be auto-requested on mount. Only trigger on explicit user tap of a "Käytä sijaintiani" button.
- Files: Phase 2 implementation TBD; likely a new `hooks/useGPS.ts` file
- Fix approach: Create a `useGPS` hook with explicit user-trigger, three error-state handlers returning `null` (triggering Tampere fallback), and optional `watchPosition` for continuous updates
- Severity: HIGH (core Phase 2 requirement)

**Distance calculation — requires memoization to avoid render jank:**
- Risk: Phase 2 success criterion 3 requires distance strings ("1,2 km") on every venue card. Computing Haversine distance for 50 venues on every GPS position update without memoization will cause expensive re-renders of the entire venue list.
- Files: `lib/utils.ts` (planned `haversineKm()` addition), `app/components/LiikuntapaikatLista.tsx`
- Fix approach: Add `haversineKm(lat1, lng1, lat2, lng2): number` to `lib/utils.ts`; compute all distances in `useMemo([userLat, userLng, paikat])` at the list container level, not per-card
- Severity: MEDIUM

**Map library migration is a breaking change touching two large components simultaneously:**
- Risk: Migrating from `@react-google-maps/api` to `@vis.gl/react-google-maps` touches `Etusivu.tsx` (526 lines) and `Kartta.tsx` (282 lines) simultaneously. The two components use different internal approaches (`<Marker>` vs `<OverlayView>`), so migration cannot be done incrementally.
- Files: `app/components/Etusivu.tsx` (entire map section), `app/components/Kartta.tsx` (entire file)
- Fix approach: Plan migration as a single atomic Phase 2 task; add `<APIProvider>` to `app/layout.tsx`; migrate both components together; test map rendering before adding GPS features
- Severity: HIGH (coordinated change required)

---

## Data Concerns

**`detectLaji` heuristic covers only 5 Google Places types:**
- Problem: `detectLaji()` in `app/api/admin/sync-paikat/route.ts` (lines 10–16) maps from Google Places `types[]` to Finnish sport categories. It handles only `gym`, `fitness_center`, `swimming_pool`, `tennis_court`, `sports_club`, and `stadium`. Venues tagged with types like `health`, `spa`, `recreation_center`, or any climbing/ice hockey specific types will fall through to the generic `'liikunta'` category.
- Files: `app/api/admin/sync-paikat/route.ts` (lines 10–16)
- Impact: Phase 3 requires at least 7 sport categories; rare categories (kiipeily, jääkiekko) will not auto-classify
- Fix approach: Add category-specific search queries rather than relying on type detection; supplement with manual `laji` overrides
- Severity: HIGH (Phase 3 requirement risk)

**`hinta_min`/`hinta_max` columns will always be null from Google Places sync:**
- Problem: Google Places API does not return pricing amounts. The sync route does not populate `hinta_min` or `hinta_max`. All venue cards show "Lisätään pian" for pricing.
- Files: `app/api/admin/sync-paikat/route.ts` (does not populate `hinta_min`/`hinta_max`), `app/components/PaikkaKortti.tsx` (line 103), `app/components/Etusivu.tsx` (line 497)
- Impact: Price filter in `LiikuntapaikatLista.tsx` is non-functional with current data
- Fix approach: Phase 3 data enrichment should populate `hinta_kuvaus` text first; numeric price fields require manual entry or a dedicated pricing source
- Severity: MEDIUM

**`parseOsoite` address parsing is fragile:**
- Problem: `parseOsoite()` in `app/api/admin/sync-paikat/route.ts` (lines 18–25) splits `formattedAddress` by `, ` and filters parts. This heuristic fails for venues with commas in names, venues in suburbs not matching "tampere" regex, and venues whose name appears mid-address.
- Files: `app/api/admin/sync-paikat/route.ts` (lines 18–25)
- Impact: Some venues may have missing or malformed `osoite` values
- Fix approach: Request `address_components` from Place Details API instead; extract `route` + `street_number` components directly
- Severity: LOW

---

## Test Coverage Gaps

**Zero automated tests exist in the codebase:**
- What's not tested: The entire codebase has no test files. No unit tests, no integration tests, no E2E tests. Phase 1 research doc noted Vitest installation as a "Wave 0 gap" but it was not executed.
- Files: No `*.test.ts` or `*.spec.ts` files exist; no `vitest.config.ts` or `jest.config.*`
- Risk: Any refactor of `lib/utils.ts`, routing logic, or Phase 2 GPS/distance code has no safety net
- Priority: HIGH

**`hintateksti` utility function has no unit coverage:**
- What's not tested: `hintateksti()` in `lib/utils.ts` handles 4 edge cases (both null, min only, max only, both provided). It is a pure function ideal for unit testing. A typo in the en-dash character would break all price display silently.
- Files: `lib/utils.ts` (lines 8–13)
- Priority: HIGH

**Admin API auth guard has no automated regression test:**
- What's not tested: The Bearer token check in both API routes is verified only manually (curl during Phase 1 UAT). No automated test confirms that a request without the header returns 401.
- Files: `app/api/admin/sync-paikat/route.ts` (lines 58–62), `app/api/hae-paikat/route.ts` (lines 58–62)
- Risk: A future refactor could accidentally remove the auth guard with no test catching it
- Priority: MEDIUM

---

*Concerns audit: 2026-05-20*
