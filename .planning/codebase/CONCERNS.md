# Codebase Concerns

**Analysis Date:** 2026-05-19

---

## Security Considerations

**Google Maps API key exposed to browser:**
- Risk: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is sent to the client and visible in browser source and network requests. Any visitor can copy it and make Maps JS API calls billed to the project.
- Files: `app/components/Etusivu.tsx:61`, `app/components/Kartta.tsx:19`
- Current mitigation: Google Cloud allows HTTP referrer restrictions on Maps JS API keys, which limits abuse somewhat.
- Severity: **MEDIUM** — mitigated by referrer restrictions as documented in `CLAUDE.md`, but the key is still visible and referrer headers can be spoofed by server-to-server callers.
- Recommendation: Enforce referrer restrictions in Google Cloud Console. Consider a backend proxy for geocoding/maps if the key is upgraded to unrestricted APIs later.

**API route has no authentication or rate limiting:**
- Risk: `GET /api/hae-paikat` triggers Google Places Text Search + N Place Details calls (one per result, potentially 20+) and then upserts to Supabase. Anyone who discovers the endpoint can trigger repeated Google API calls and database writes at cost to the project.
- Files: `app/api/hae-paikat/route.ts`
- Current mitigation: None.
- Severity: **HIGH** — unbounded external API cost and database writes from an unauthenticated public endpoint.
- Recommendation: Add a secret token check (`Authorization: Bearer <ADMIN_SECRET>`), or move this to a cron job / admin-only context. At minimum, add a simple env-var secret comparison before processing.

**Non-null assertion on environment variables at module load:**
- Risk: `lib/supabase.ts` uses `!` non-null assertions on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If either variable is missing, the Supabase client is created with `undefined`, causing silent failures or cryptic runtime errors rather than a clear startup error.
- Files: `lib/supabase.ts:3-4`
- Severity: **MEDIUM**
- Recommendation: Add a runtime guard: `if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase env vars missing')`.

**API route non-null assertion on API key:**
- Risk: `app/api/hae-paikat/route.ts:34` uses `API_KEY!` when constructing the Place Details URL even though line 58 guards against `API_KEY` being falsy. If the guard is ever removed or the code path changes, `undefined` will be appended to the URL silently.
- Files: `app/api/hae-paikat/route.ts:34`
- Severity: **LOW**
- Recommendation: Replace `API_KEY!` with `API_KEY as string` after the guard, or pass through a validated variable.

---

## Technical Debt

**`useJsApiLoader` called twice — Google Maps script loaded twice:**
- Issue: Both `Etusivu.tsx` and `Kartta.tsx` call `useJsApiLoader` independently with the same API key. The `@react-google-maps/api` library does de-duplicate the script tag, but each component independently manages load state. If both components ever mount simultaneously (unlikely now but possible in future layouts), behaviour is undefined.
- Files: `app/components/Etusivu.tsx:60-62`, `app/components/Kartta.tsx:18-20`
- Impact: Redundant initialisation calls; potential flash of loading state when switching between views that use either component.
- Severity: **MEDIUM**
- Fix approach: Extract a shared `useGoogleMaps()` hook or wrap the app in a single `<LoadScript>` provider so the loader is instantiated once.

**Supabase client is a singleton instantiated at module scope:**
- Issue: `lib/supabase.ts` creates one shared `supabase` client at import time. In Next.js server components this means the same client (with anon key) is reused across all requests, which is fine for anon reads but will cause problems if auth/RLS per-user is ever introduced.
- Files: `lib/supabase.ts`
- Severity: **LOW** now, **HIGH** if auth is added.
- Fix approach: Use `createServerClient` from `@supabase/ssr` for server components and `createBrowserClient` for client components when auth is introduced.

**`hintateksti` helper duplicated in three places:**
- Issue: The same price-formatting function is copy-pasted in `app/components/PaikkaKortti.tsx:22-27`, `app/components/Etusivu.tsx:42-47`, and `app/paikat/[id]/page.tsx:7-12`.
- Files: `app/components/PaikkaKortti.tsx`, `app/components/Etusivu.tsx`, `app/paikat/[id]/page.tsx`
- Severity: **LOW**
- Fix approach: Move to `lib/utils.ts` and import from there.

**`lajiVari` color map in `Kartta.tsx` duplicates `lajiKonfig` in `lib/lajit.ts`:**
- Issue: `app/components/Kartta.tsx:9-15` defines a separate `lajiVari` record with inline sport colors, duplicating the single source of truth in `lib/lajit.ts`. CLAUDE.md explicitly states "Do not inline sport colors in components."
- Files: `app/components/Kartta.tsx:9-15`
- Severity: **MEDIUM** — violates the documented convention and will drift from `lajiKonfig` as sports are added.
- Fix approach: Replace `lajiVari` with a lookup from `lajiKonfig[laji]?.badgeTw` and `lajiKonfig[laji]?.accentBg`.

**`app/page.tsx` ignores the `nakyma` search param used by the rest of the app:**
- Issue: `app/page.tsx:26` checks `searchParams.view === 'lista'` (the `view` param), but `LiikuntapaikatLista` and `BottomNav` use `nakyma` (`?nakyma=kartta`) as the canonical view param. `BottomNav` uses `?map=1` for map and `?view=lista` for list (neither matches what `Etusivu` or `LiikuntapaikatLista` expect). The routing is internally inconsistent.
- Files: `app/page.tsx:26`, `app/components/BottomNav.tsx:66-71`, `app/components/LiikuntapaikatLista.tsx:50`
- Severity: **HIGH** — deep links from `BottomNav` (which uses `?map=1` and `?view=lista`) do not match the params the server page (`?view='lista'`) or client component (`?nakyma=kartta`) read. Navigation is partially broken by design.
- Fix approach: Standardise on a single param scheme (e.g., `?nakyma=kartta|lista`) across `app/page.tsx`, `BottomNav`, and `LiikuntapaikatLista`.

**`Etusivu` component handles map rendering internally rather than delegating to `Kartta`:**
- Issue: `Etusivu.tsx` reimplements `GoogleMap` + `Marker` rendering in-line with scroll-driven transforms. This means two separate map implementations exist: one in `Kartta.tsx` (for `LiikuntapaikatLista`) and one embedded in `Etusivu.tsx`. Map style arrays and marker icon config are not shared.
- Files: `app/components/Etusivu.tsx:19-28`, `app/components/Kartta.tsx:9-14`
- Severity: **MEDIUM**
- Fix approach: Extract map style constants and marker icon factories to `lib/mapConfig.ts`.

---

## Missing Features / Stub Pages

**Suosikit (Favourites) page is a stub:**
- Issue: `app/suosikit/page.tsx` renders "Suosikkitoiminto on tulossa pian" with no implementation. The BottomNav shows a Heart tab pointing here, making it a dead end for users.
- Files: `app/suosikit/page.tsx`
- Severity: **MEDIUM** — user-facing broken promise.
- Fix approach: Implement localStorage-backed favourites, or remove the nav tab until the feature is ready.

**No database schema or migration files present:**
- Issue: There are no SQL migration files, Supabase schema definitions, or seed scripts in the repository. The Supabase table `liikuntapaikat` structure (columns: `id`, `place_id`, `nimi`, `laji`, `osoite`, `kaupunki`, `latitude`, `longitude`, `hinta_min`, `hinta_max`, `varauslinkki`, `kuvaus`, `puhelin`) is inferred only from the API route and component code.
- Files: (none — missing)
- Severity: **MEDIUM** — onboarding a new developer requires reverse-engineering the schema from code.
- Fix approach: Add a `supabase/migrations/` directory with the initial schema SQL, or export the schema from the Supabase dashboard and commit it.

---

## Performance Concerns

**No pagination — all rows fetched on every page load:**
- Issue: `app/page.tsx:12-13` fetches all rows from `liikuntapaikat` with `.select(…).order('nimi')` and no `.limit()`. All filtering (sport type, price, search text) happens client-side in `LiikuntapaikatLista`.
- Files: `app/page.tsx:12-13`, `app/components/LiikuntapaikatLista.tsx:64-78`
- Impact: Acceptable now (small dataset), but will degrade linearly as the database grows. A table with 500+ rows will ship kilobytes of JSON on every navigation.
- Severity: **LOW** now, **HIGH** at scale.
- Fix approach: Add server-side filtering and pagination, or use Supabase's `range()` + `ilike()` for search.

**`Promise.all` fans out N Google Place Details calls simultaneously:**
- Issue: `app/api/hae-paikat/route.ts:114` runs one `fetchPlaceDetails` call per result in parallel with no concurrency limit. A Text Search returning 20 results triggers 20 simultaneous HTTP calls to Google's API.
- Files: `app/api/hae-paikat/route.ts:114`
- Impact: Risk of hitting Google's per-second rate limit; also adds latency variance since the route waits for the slowest call.
- Severity: **MEDIUM**
- Fix approach: Use a batched concurrency utility (e.g., p-limit) with a cap of 5 concurrent requests.

**Weather API called on every `Etusivu` mount with no caching:**
- Issue: `app/components/Etusivu.tsx:83-88` fetches from Open-Meteo on every component mount with no cache, deduplication, or stale-while-revalidate strategy.
- Files: `app/components/Etusivu.tsx:83-88`
- Impact: Unnecessary network round-trips on each page visit; weather data rarely changes within a session.
- Severity: **LOW**
- Fix approach: Cache the response in `sessionStorage` with a short TTL (e.g., 15 minutes).

**`select('*')` on detail page fetches all columns:**
- Issue: `app/paikat/[id]/page.tsx:19` uses `.select('*')` instead of naming only the columns actually rendered. Any future columns added to the table (e.g., images, JSON blobs) will be transferred unnecessarily.
- Files: `app/paikat/[id]/page.tsx:19`
- Severity: **LOW**
- Fix approach: Replace with an explicit column list matching what the page uses.

---

## Scalability Concerns

**City hard-coded as "Tampere" everywhere:**
- Issue: `app/api/hae-paikat/route.ts:6-8,68,121` hard-codes Tampere coordinates, search query, and city name. `LiikuntapaikatLista` renders "Tampere · N paikkaa" unconditionally.
- Files: `app/api/hae-paikat/route.ts:6-8`, `app/components/LiikuntapaikatLista.tsx:97`
- Severity: **MEDIUM** — expanding to other cities requires touching multiple files.
- Fix approach: Move city config (name, lat, lng, search radius) to a `lib/config.ts` constant, or make the API route accept query parameters for city.

**Sport type detection in API is incomplete:**
- Issue: `app/api/hae-paikat/route.ts:10-15` maps Google Places types to app sport types but covers only 5 sports. `padel` and `jooga` are not detectable (no matching Google Places types), so all padel and yoga venues fall back to the generic `'liikunta'` category and never appear under their proper filter.
- Files: `app/api/hae-paikat/route.ts:10-15`
- Severity: **MEDIUM** — data quality issue affecting the sport filter UX.
- Fix approach: Add name-based heuristics (e.g., match `/padel/i` or `/jooga|yoga/i` in the place name) as a fallback when type detection fails.

---

## Risk Areas

**No error boundary around client components:**
- Issue: Neither `Etusivu` nor `LiikuntapaikatLista` are wrapped in a React Error Boundary. A runtime error (e.g., from Framer Motion, `@react-google-maps/api`, or a malformed data record) will crash the entire page.
- Files: `app/page.tsx`, `app/components/Etusivu.tsx`, `app/components/LiikuntapaikatLista.tsx`
- Severity: **MEDIUM**
- Fix approach: Add an `error.tsx` in `app/` (Next.js App Router's built-in error boundary) that renders a user-friendly fallback.

**No `loading.tsx` for the main route:**
- Issue: There is no `app/loading.tsx`. The server component in `app/page.tsx` fetches from Supabase before rendering. During this fetch there is no loading UI — Next.js will show a blank page until the data resolves.
- Files: `app/page.tsx` (missing `app/loading.tsx`)
- Severity: **MEDIUM**
- Fix approach: Add `app/loading.tsx` with a skeleton or spinner.

**Open-Meteo weather fetch has a silent catch:**
- Issue: `app/components/Etusivu.tsx:87` catches all errors with `.catch(() => {})`. If the fetch fails (network error, API down), `saa` stays `null` and the widget shows a skeleton indefinitely with no user feedback.
- Files: `app/components/Etusivu.tsx:83-88`
- Severity: **LOW**
- Fix approach: Set an error state and render a fallback text (e.g., "Säätietoja ei saatavilla") instead of an infinite skeleton.

**Google Maps loading failure has no error path:**
- Issue: `useJsApiLoader` returns `{ isLoaded, loadError }` but neither `Etusivu.tsx` nor `Kartta.tsx` check `loadError`. If the Maps script fails to load (wrong key, network issue, referrer block), the user sees an infinite loading spinner/placeholder with no indication of the problem.
- Files: `app/components/Etusivu.tsx:60-62`, `app/components/Kartta.tsx:18-20`
- Severity: **MEDIUM**
- Fix approach: Destructure `loadError` and render an error state when it is set.

---

## Test Coverage Gaps

**Zero application tests:**
- Issue: There are no test files anywhere in the project source (only tests inside `node_modules`). No unit, integration, or E2E tests exist for any component, utility function, API route, or data-fetching logic.
- Files: All of `app/`, `lib/`, `components/`
- Risk: Any refactor or new feature risks silent regressions. The `detectLaji` sport-mapping logic, `parseOsoite` address parsing, `hintateksti` formatting, and filter/search logic in `LiikuntapaikatLista` are all untested.
- Priority: **HIGH**
- Recommendation: At minimum, add Vitest unit tests for `lib/` utilities and the pure functions in the API route (`detectLaji`, `parseOsoite`, `hintateksti`).

---

## Dependencies at Risk

**`shadcn` listed as a runtime dependency instead of devDependency:**
- Risk: `shadcn` is a CLI code-generation tool, not a runtime package. Listing it under `dependencies` in `package.json:25` includes it in the production bundle tree unnecessarily.
- Files: `package.json:25`
- Severity: **LOW**
- Fix approach: Move `shadcn` to `devDependencies`.

**`tw-animate-css` installed but conflicts with Tailwind v3:**
- Risk: `tw-animate-css` is a Tailwind v4 plugin. `CLAUDE.md` explicitly warns not to add it, but `package.json:23` lists it as a production dependency. If `globals.css` ever imports it, it will break the Tailwind v3 build.
- Files: `package.json:23`
- Severity: **MEDIUM** — currently dormant but a trap for future developers.
- Fix approach: Remove `tw-animate-css` from `package.json` since it is incompatible and unused.

**`lucide-react` installed but not used in any source file:**
- Risk: Adds bundle weight for icons that are not consumed — all icons in the codebase are inline SVGs.
- Files: `package.json:16`
- Severity: **LOW**
- Fix approach: Remove `lucide-react` unless planned icon imports are imminent.

---

*Concerns audit: 2026-05-19*
