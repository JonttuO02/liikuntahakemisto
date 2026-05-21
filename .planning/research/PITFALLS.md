# Domain Pitfalls — v1.1 Feature Addition

**Domain:** Adding auth, clustering, PWA, and multi-city to existing Next.js 14 + Supabase app
**Researched:** 2026-05-21
**Confidence:** HIGH (all critical pitfalls verified against official docs or confirmed GitHub issues)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or security breaches.

---

### PITFALL-01: Existing `supabase` singleton breaks with Auth (session leakage)

**Phase:** Auth (AUTH-01, AUTH-02)

**What goes wrong:** `lib/supabase.ts` exports a module-level singleton `supabase` created once at import time. This is fine for read-only public data with the anon key. The moment Auth is added, the singleton stores one user's session in process memory. On Vercel (and any warm-lambda model), the same module instance is reused across concurrent requests — user A's session leaks into user B's request.

**Why it happens:** `createClient()` in `@supabase/supabase-js` stores the session internally. A shared instance cannot distinguish per-request users in a serverless environment.

**Consequences:** Authenticated users see each other's favorites. RLS policies are sent the wrong user's JWT. Hard to reproduce locally (single-user dev server), appears in production under load. This is a documented security advisory from the Supabase team.

**Prevention:** Install `@supabase/ssr` (not `@supabase/auth-helpers-nextjs` — that package is deprecated). Create per-request server clients via `createServerClient()` inside Route Handlers and Server Components. The existing `supabase` singleton in `lib/supabase.ts` remains valid only for server-side anonymous reads (page.tsx data fetching with anon key). The `supabaseAdmin` export is also fine — it uses the service role key and intentionally bypasses RLS. Do not add auth to either of these shared instances.

**Detection:** Log in as two users in different browser sessions simultaneously. Any cross-user data visible to either is the symptom.

---

### PITFALL-02: Missing `middleware.ts` causes silent auth logout after ~1 hour

**Phase:** Auth (AUTH-01)

**What goes wrong:** Supabase Auth uses short-lived access tokens (default 1 hour) and a refresh token in a cookie. Next.js Server Components cannot write cookies. Without middleware, the expired access token is never refreshed server-side. `getUser()` returns null even though the refresh token is valid. Users appear logged out after one hour of inactivity, but the session is recoverable — the root cause is invisible to both user and developer.

**Why it happens:** Server Components run in a read-only cookie context. Only middleware and Route Handlers can write `Set-Cookie` headers. The `@supabase/ssr` package provides a `createServerClient` that hooks into the middleware cookie API and refreshes the token transparently on every request.

**Consequences:** Auth works for the first hour, then breaks silently. Favorites fail. Auth-gated features return 401. Extremely difficult to debug because `getSession()` (reads the unverified cookie) still returns a value while `getUser()` (hits the Supabase Auth server) returns null.

**Prevention:** Add `middleware.ts` at the project root (same level as `app/`). The middleware must call `supabase.auth.getUser()` on every request to refresh tokens. This is not optional — it is load-bearing for any app with sessions lasting more than an hour. The middleware file does not exist in the current codebase.

**Detection:** Log in, wait 61 minutes without page reload, attempt any favorites write. If it fails with a 401, middleware is missing or misconfigured.

---

### PITFALL-03: Google OAuth redirect URI misconfiguration locks out production

**Phase:** Auth (AUTH-01)

**What goes wrong:** Google OAuth requires exact `Authorized redirect URIs` in Google Cloud Console AND the Supabase dashboard "Redirect URLs" allowlist. Three places must all agree: (1) Google Cloud Console authorized URIs, (2) Supabase Auth settings, (3) the `redirectTo` value passed at sign-in time. Any mismatch produces an opaque `redirect_uri_mismatch` error shown directly to the user — not in server logs.

**Why it happens:** Supabase's `Site URL` defaults to `http://localhost:3000` (set at project creation). If not updated to the production URL, OAuth flows that omit `redirectTo` redirect back to localhost even in production. The inverse also happens: a hardcoded production `redirectTo` breaks local development.

**Consequences:** Production Google OAuth is dead on arrival unless all three locations are pre-configured. The error message exposes the misconfigured redirect URI to the user.

**Prevention:**
1. Set Supabase `Site URL` to the production domain before any OAuth testing on production.
2. Add both `http://localhost:3000/**` and `https://yourdomain.fi/**` to Supabase "Redirect URLs" using the wildcard syntax (not exact paths).
3. In Google Cloud Console, add both origins and the Supabase callback URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Generate `redirectTo` dynamically from `request.headers.get('origin')` in the Server Action that initiates sign-in. Never hardcode the origin.

**Detection:** Test Google OAuth from both localhost and production environments independently — they are distinct failure modes.

---

### PITFALL-04: RLS `INSERT` policy without `WITH CHECK` allows user_id spoofing on the suosikit table

**Phase:** Auth / Favorites (AUTH-02)

**What goes wrong:** An INSERT policy written as `USING (auth.uid() = user_id)` instead of `WITH CHECK (auth.uid() = user_id)` passes Supabase's policy editor validation but does not enforce the constraint at write time. A client can INSERT a row with any `user_id` UUID, inserting favorites into another user's list. The `USING` clause applies to row visibility (SELECT, UPDATE, DELETE) — `WITH CHECK` applies to rows being written (INSERT, UPDATE).

**Why it happens:** Supabase's Table Editor generates incomplete policy templates. The UI does not warn when `WITH CHECK` is absent on INSERT policies. Many tutorial examples predate the current RLS best practice documentation.

**Consequences:** Any authenticated user can pollute any other user's favorites. Data integrity is broken at the database level. Not detectable at the application layer without explicit adversarial testing.

**Prevention:**

```sql
-- Correct favorites INSERT policy
CREATE POLICY "Users can insert own favorites"
ON suosikit FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Correct favorites SELECT policy
CREATE POLICY "Users can read own favorites"
ON suosikit FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Correct favorites DELETE policy
CREATE POLICY "Users can delete own favorites"
ON suosikit FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);
```

The `(select auth.uid())` subquery wrapper (rather than bare `auth.uid()`) is preferred — Postgres caches the subquery result instead of evaluating the function once per row, which matters for tables with many rows. Add a `CREATE INDEX ON suosikit(user_id)` — without it, RLS triggers a sequential scan on every authenticated favorites request.

**Detection:** The SQL Editor in the Supabase dashboard bypasses RLS (runs as superuser). Never use the SQL editor to test RLS policies. Test exclusively through the client SDK with a real authenticated user session.

---

### PITFALL-05: `AdvancedMarker` requires `mapId` — existing `<Map>` components lack it

**Phase:** Map clustering (MAP-06)

**What goes wrong:** The `@googlemaps/markerclusterer` library (used in all `@vis.gl/react-google-maps` clustering examples) requires `AdvancedMarkerElement` rather than the deprecated `Marker`. `AdvancedMarkerElement` requires a `mapId` prop on the `<Map>` component — without it, advanced markers silently fail to render or throw a console error and produce an empty map. Both `<Map>` instances in `Etusivu.tsx` (preview and fullscreen) use the legacy `<Marker>` without `mapId`.

**Why it happens:** The legacy `Marker` API works without `mapId`. The newer `AdvancedMarkerElement` requires Google's vector renderer, which is enabled via a Cloud-configured Map ID. The migration is not prominently documented in the clustering examples.

**Consequences:** Switching to clustering without first adding `mapId` produces a map with no markers at all — both clusters and individual pins disappear with no visible error in the UI.

**Prevention:** Create a Map ID in Google Cloud Console (Maps Platform > Map Styles). Pass `mapId` to both `<Map>` instances in `Etusivu.tsx`. Use `"DEMO_MAP_ID"` for local development (Google's testing value), and store the production Map ID as `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. Add this migration before any clustering work begins.

**Detection:** After adding `mapId`, verify both the preview map and the fullscreen map still render markers. Then migrate from `<Marker>` to `<AdvancedMarker>` and verify again before adding the clusterer.

---

### PITFALL-06: Recreating the `MarkerClusterer` instance on every render causes severe performance regression

**Phase:** Map clustering (MAP-06)

**What goes wrong:** If the `MarkerClusterer` instance is created inside a React component body (or inside a `useEffect` with dependencies that change on filter updates), a new clusterer is instantiated on every filter change. Each instantiation discards the internal supercluster index and rebuilds the rtree for all zoom levels from scratch. With 50–200 markers post-city-expansion, this causes visible freezes (100–500ms) whenever the user changes the sport filter.

**Why it happens:** The declarative React mental model conflicts with the imperative lifecycle of `MarkerClusterer`. React re-renders when props change; the clusterer needs to be stable across renders. This is specifically flagged in the vis.gl GitHub discussion tracker as the primary performance complaint.

**Consequences:** The map becomes noticeably sluggish after city expansion. Filter changes — which update the markers array — trigger full re-clustering on every tap.

**Prevention:** Store the clusterer instance in a `useRef`. Initialize it once in a `useEffect` with an empty dependency array. Update markers via `clusterer.current.addMarkers()` / `clusterer.current.clearMarkers()` when the filtered markers list changes, instead of recreating the clusterer. Alternatively, use the `supercluster` library directly with `useMemo` — this approach is more React-idiomatic and faster for datasets under 500 markers.

**Detection:** Open the fullscreen map, change the sport filter 5 times rapidly. Profile with Chrome DevTools Performance tab and look for long tasks coinciding with filter changes.

---

### PITFALL-07: Service worker intercepts Next.js RSC fetch requests, breaking client-side navigation

**Phase:** PWA (PWA-01, PWA-02)

**What goes wrong:** Next.js App Router uses RSC (React Server Component) payloads for client-side navigation — internal fetch requests identified by the `_rsc` query parameter and `RSC: 1` header. A broadly-configured service worker that intercepts all same-origin requests and returns cached responses will serve stale RSC payloads. Navigation shows old data, broken pages, or infinite loading spinners without any visible error.

**Why it happens:** Generic Workbox `NetworkFirst` or `CacheFirst` strategies catch `/_next/` and `/` fetch requests without distinguishing RSC payload requests from normal HTML requests. The URL alone is insufficient to tell them apart — the `_rsc` query parameter is the differentiator.

**Consequences:** After a deploy, users with the PWA installed navigate to routes that serve cached RSC payloads from the previous build. The AI widget may show a cached response from days ago. Favorites may show stale data. No error is shown — the app silently serves old content.

**Prevention:**
- Use Serwist (`@serwist/next`), not the unmaintained `next-pwa`. Serwist's Next.js integration is aware of Next.js's build output structure.
- Exclude RSC fetch requests from service worker caching by inspecting the `_rsc` URL parameter in runtime caching matchers.
- The `/api/saasuositus` route must use `NetworkFirst` with a short timeout — not `CacheFirst`. The AI response changes daily; `sessionStorage` already handles client-side caching and the service worker should not add a second layer.
- Always disable the service worker in development (`disable: process.env.NODE_ENV === 'development'`) to prevent dev-cycle cache pollution. Serwist supports this flag natively.

**Detection:** Build with `next build`, install the PWA, deploy a new version, then navigate the installed PWA without refreshing. If pages show pre-deploy content without a reload prompt, RSC caching is active.

---

## Moderate Pitfalls

Mistakes that require non-trivial fixes but do not cause rewrites.

---

### PITFALL-08: `getSession()` vs `getUser()` — trusting unverified JWT data for auth decisions

**Phase:** Auth (AUTH-01, AUTH-02)

**What goes wrong:** `supabase.auth.getSession()` returns session data parsed directly from the cookie — it does not verify the JWT with the Supabase Auth server. This data can be tampered with by modifying the cookie on the client. Using `getSession()` as the source of truth for "is this user logged in?" in Server Components is a documented security vulnerability.

**Why it happens:** `getSession()` requires no network round-trip and is cheaper. Many tutorials use it for convenience. The difference between `getSession()` and `getUser()` is not obvious from the function names.

**Consequences:** A client can forge auth state by manipulating cookies, potentially bypassing auth-gated server-rendered UI. RLS still protects the database (the actual JWT is validated by Postgres on every query), but the Server Component may render incorrectly.

**Prevention:** Always use `supabase.auth.getUser()` for auth decisions in Server Components and middleware. Only use `getSession()` when you need the raw access token string (e.g., passing it to a third-party service) or for client-side token refresh in browser contexts.

---

### PITFALL-09: PWA install prompt (`beforeinstallprompt`) does not fire on iOS Safari

**Phase:** PWA (PWA-02)

**What goes wrong:** The `beforeinstallprompt` browser event — the standard mechanism for a custom "Add to Home Screen" button — is Chrome/Android-only. It does not exist on iOS Safari. If the install UX is implemented only via this event, iOS users see nothing.

**Why it happens:** Many PWA tutorials document `beforeinstallprompt` as the standard install mechanism without prominently flagging the iOS Safari gap. iOS Safari has a different, manual install flow via the Share sheet.

**Consequences:** "Lisää kotinäyttöön" (PWA-02) works on Android Chrome but is invisible on iOS. This is a significant reach problem in Finland where iOS market share is high.

**Prevention:** Detect iOS Safari (`/iPad|iPhone|iPod/.test(navigator.userAgent)`) and show a manual instruction overlay: "Paina Jaa-painiketta ja valitse 'Lisää kotinäyttöön'". Suppress with a `sessionStorage` flag so it only shows once per session. Implement `beforeinstallprompt` for Android in parallel. Both code paths are necessary.

---

### PITFALL-10: Adding `kaupunki` filter without a database index causes slow queries at scale

**Phase:** City expansion (DATA-05, DATA-06, DATA-07)

**What goes wrong:** Adding Helsinki and Turku triples the venue count (~60 rows → ~180 rows). The current `page.tsx` fetches all rows and passes them to `Etusivu.tsx` for client-side filtering — this pattern does not scale. Additionally, the `WHERE kaupunki = 'Helsinki'` filter in a future server-side query triggers a sequential scan without a database index.

**Why it happens:** The existing query fetches all places in one request. This worked for 60 Tampere venues. With multi-city and server-side filtering added later, the missing index becomes measurable.

**Consequences:** Initial data payload balloons with all cities loaded regardless of the selected city. Page load time grows linearly with venue count as cities are added.

**Prevention:**
1. Add a `CREATE INDEX ON liikuntapaikat(kaupunki)` in the same migration that adds city data.
2. For v1.1 (180 rows), client-side filtering remains acceptable. However, pass `kaupunki` as a `searchParam` to `page.tsx` and filter in the Supabase `.select()` call — this establishes the correct pattern for server-side filtering without requiring a component rewrite in v1.2.

---

### PITFALL-11: `lajit_lista` and `featured` are missing from the `page.tsx` select — TypeScript won't catch it

**Phase:** UI changes (UI-05, ADS-02)

**What goes wrong:** `Liikuntapaikka` in `lib/types.ts` marks `hinta_kuvaus`, `lajit_lista`, and `featured` as optional (`?`). The `page.tsx` Supabase query explicitly names columns and currently does not include `lajit_lista`. When UI-05 ("vain jäsenyys" badge from `lajit_lista`) and ADS-02 ("Sponsoroitu" badge from `featured`) are implemented, the component reads a field that is `undefined` at runtime. TypeScript does not catch this because the field is marked optional — the type allows `undefined`.

**Why it happens:** Explicit `select()` column lists in the Supabase client do not automatically fail if a column is omitted — the field is simply absent from the result. The optional `?` in the type was added as "forward compatibility" but it masks the omission bug.

**Prevention:** When implementing any feature that reads a column, audit the `select()` string in both `page.tsx` and `paikat/[id]/page.tsx`. Add `featured` and `lajit_lista` to the `page.tsx` select call in the same PR that introduces UI-05 and ADS-02. Consider generating TypeScript types directly from the Supabase schema (`supabase gen types typescript`) to make omitted columns a compile-time error.

---

### PITFALL-12: `sync-paikat` admin route hardcodes `kaupunki: 'Tampere'` — will corrupt Helsinki and Turku rows

**Phase:** City expansion (DATA-05, DATA-06)

**What goes wrong:** In `app/api/admin/sync-paikat/route.ts` line 159, every upserted row has `kaupunki: 'Tampere'` hardcoded in the upsert mapper. When the route is extended for Helsinki and Turku with new `SPORT_QUERIES` entries, if the city string is not correctly threaded through from the query definition to the upsert payload, every sync run will re-tag Helsinki and Turku venues as `'Tampere'`. The upsert uses `place_id` as the conflict key — it updates existing rows including their `kaupunki` field.

**Why it happens:** The single-city assumption was baked into the route when Tampere was the only city. The `place_id` upsert conflict key means incorrect city tags silently overwrite correct ones.

**Prevention:** Extend the `SportQuery` interface with a `kaupunki: string` field. Thread the city string from the query definition through `fetchSportQuery` into the upsert payload mapper. Before running any production sync for Helsinki or Turku, run a dry-run that logs the city field of rows that would be upserted — verify city tagging before any write operation.

---

### PITFALL-13: Zoom-dependent marker-to-card transition needs hysteresis to avoid oscillation

**Phase:** Map clustering (MAP-06, MAP-07)

**What goes wrong:** MAP-06 requires a "zoom-dependent view — clusters → info cards" transition. A naive implementation using `onZoomChanged` to toggle between cluster and card views oscillates at the threshold zoom level. Google Maps' zoom animation is continuous — as the map settles at the target zoom, the `onZoomChanged` event fires multiple times with values straddling the threshold. This causes the display mode to flip back and forth rapidly during zoom gestures.

**Why it happens:** React state updates on every `onZoomChanged` event without considering the transition direction or the zoom settling behavior.

**Prevention:** Implement a 1-level hysteresis band: transition from clusters to cards at zoom >= 15, transition from cards back to clusters at zoom <= 13. Store `displayMode` as state and only update it when the zoom crosses the appropriate boundary, not on every zoom change event. Debounce the `onZoomChanged` handler to 150ms to avoid firing during animation frames.

---

## Minor Pitfalls

---

### PITFALL-14: AI widget city name (AI-04) is hardcoded to Tampere coordinates

**Phase:** AI widget (AI-04)

**What goes wrong:** The `/api/saasuositus` Route Handler hardcodes `latitude=61.4978&longitude=23.7610` (Tampere) in the Open-Meteo URL and hardcodes "Tampere" in the Claude prompt. After city expansion, a Helsinki user sees a Tampere weather recommendation. AI-04 requires showing the city name next to the temperature — which means the API must receive the active city.

**Prevention:** Add a `?kaupunki=` query parameter to the `/api/saasuositus` call. Maintain a `CITY_COORDS` lookup table in the route (Helsinki, Turku, Tampere coordinates). The client passes the currently-selected city. This keeps GPS coordinates out of the API call while supporting multi-city recommendations. Update the `sessionStorage` cache key to include the city: `saasuositus-{date}-{kaupunki}`.

---

### PITFALL-15: PWA manifest `start_url` must not include query parameters

**Phase:** PWA (PWA-02)

**What goes wrong:** If `start_url` in `manifest.json` is set to `/?nakyma=kartta` (to default to the map view), the PWA install check may fail on some browsers, or the app may open incorrectly after a URL routing change. The `start_url` must match the `scope` and should be stable across deploys.

**Prevention:** Set `start_url: "/"` and `scope: "/"`. The map can be the default view via application-level logic (setting the initial state in `Etusivu.tsx`) without encoding it in the manifest URL. Also ensure icon sizes include both 192x192 and 512x512 with a `"maskable"` purpose entry for Android adaptive icons and a separate `apple-touch-icon` meta tag in `layout.tsx` for iOS.

---

### PITFALL-16: `suosikit` page renders before auth gate is implemented

**Phase:** Auth (AUTH-01, AUTH-02)

**What goes wrong:** `app/suosikit/page.tsx` is currently a static placeholder. NavBar already links to `/suosikit`. When Auth is added, the page must gate on session: redirect to a login page if unauthenticated, show favorites if authenticated. If the auth gate is added after the favorites UI is built, unauthenticated users can reach the favorites UI shell and trigger Supabase calls that fail with 401.

**Prevention:** Implement the auth gate — using `getUser()` in the Server Component to redirect to `/kirjaudu` if no session — as the first step in AUTH-02, before writing any favorites list UI. The redirect should be a hard server-side redirect (`redirect('/kirjaudu')` from `next/navigation`), not a client-side conditional render.

---

## Phase-Specific Warnings

| Phase Topic | Pitfall | Mitigation |
|-------------|---------|------------|
| AUTH-01: Install @supabase/ssr | PITFALL-01 (session leakage) | Create per-request server clients, do not extend existing singletons |
| AUTH-01: Add middleware.ts | PITFALL-02 (silent logout) | middleware.ts must exist before any auth UI ships |
| AUTH-01: Google OAuth | PITFALL-03 (redirect URI) | Configure Google Cloud + Supabase dashboard before first OAuth test |
| AUTH-01: Session reads | PITFALL-08 (getSession vs getUser) | getUser() in all Server Components and middleware |
| AUTH-02: suosikit table RLS | PITFALL-04 (missing WITH CHECK) | Use WITH CHECK + subquery form, test via SDK not SQL editor |
| AUTH-02: suosikit page | PITFALL-16 (no auth gate) | Server-side redirect before any favorites UI |
| MAP-06: Before clustering work | PITFALL-05 (missing mapId) | Add mapId env var and <Map> prop as a prerequisite step |
| MAP-06: Clusterer setup | PITFALL-06 (instance recreation) | useRef for clusterer, or use supercluster + useMemo approach |
| MAP-06: Zoom transitions | PITFALL-13 (threshold oscillation) | 1-level hysteresis band + debounce |
| PWA-01: Service worker config | PITFALL-07 (RSC interception) | Use Serwist, exclude _rsc requests, disable SW in dev mode |
| PWA-02: Install prompt | PITFALL-09 (iOS Safari gap) | iOS instruction overlay + beforeinstallprompt for Android |
| PWA-02: Manifest | PITFALL-15 (start_url with params) | start_url: "/", no query params, include maskable icons |
| DATA-05/06: City sync | PITFALL-12 (hardcoded Tampere) | Thread kaupunki through SportQuery before running new-city syncs |
| DATA-07: City filter | PITFALL-10 (no DB index) | Add kaupunki index in same migration as city data |
| UI-05/ADS-02: Badge logic | PITFALL-11 (missing select columns) | Add lajit_lista and featured to page.tsx select before implementing |
| AI-04: City name in widget | PITFALL-14 (hardcoded coordinates) | Parameterize /api/saasuositus with kaupunki query param |

---

## Sources

- Supabase SSR Auth for Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase RLS performance and best practices: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- Supabase Auth Next.js troubleshooting: https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Google OAuth with Supabase: https://supabase.com/docs/guides/auth/social-login/auth-google
- getSession() security discussion: https://github.com/orgs/supabase/discussions/23224
- vis.gl clustering performance (big data is slow): https://github.com/visgl/react-google-maps/discussions/526
- AdvancedMarker requires mapId: https://developers.google.com/maps/documentation/javascript/advanced-markers/start
- Serwist for Next.js PWA: https://serwist.pages.dev/docs/next/getting-started
- Next.js official PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- vis.gl custom marker clustering example: https://visgl.github.io/react-google-maps/examples/custom-marker-clustering
