# Domain Pitfalls

**Domain:** Finnish sports venue directory with GPS, AI recommendations, and data enrichment
**Project:** Liikuntahakemisto
**Researched:** 2026-05-19
**Stack context:** Next.js 14 App Router, Supabase/Postgres, Google Maps/Places API, Claude API (AI widget), Open-Meteo, Framer Motion, Tailwind v3

---

## Critical Pitfalls

Mistakes that cause rewrites, cost explosions, or complete feature failures.

---

### Pitfall C-1: Unauthenticated Data Ingestion Endpoint

**Severity:** HIGH
**What goes wrong:** `GET /api/hae-paikat` has zero authentication. Any person who discovers the URL (via browser devtools, Vercel deployment URL guessing, or web crawlers) can trigger 20+ Google Places Detail API calls per request plus Supabase upserts — all billed to the project. At ~$0.017 per Place Details call, 1,000 abuse requests = $340 in API fees before anyone notices.
**Why it happens:** Development shortcut — the route was built for manual triggering and never hardened.
**Consequences:** Unbounded Google API bill, Supabase write quota exhaustion, potential data corruption from concurrent upserts.
**Prevention:**
- Add `Authorization: Bearer ${ADMIN_SECRET}` header check at the top of the route handler before any external calls.
- Move data ingestion entirely to a Supabase Edge Function triggered by a cron schedule (Supabase has built-in cron via pg_cron).
- Set Google Cloud billing alerts at €10, €50, and €200 thresholds immediately.
**Detection:** Sudden spike in Google Cloud Console billing dashboard; unexpected row count growth in `liikuntapaikat`.
**Phase that must address it:** First phase that touches API enrichment or GPS features — this must be fixed before any new data pipeline work begins.

---

### Pitfall C-2: Google Places API Cost Explosion via Place Details

**Severity:** HIGH
**What goes wrong:** The current pattern calls one Place Details request per search result (up to 20 results). Place Details costs $0.017/call. If the data refresh is automated (cron) and covers 50 sport types × 20 results = 1,000 calls per run. Daily runs = $6.20/day = $186/month just for data enrichment — before any user-facing geocoding.
**Why it happens:** The Places API billing model charges per field mask on New Places API (v1), or per call on legacy Places API. Fetching all fields (the current `select='*'` equivalent) maximises cost.
**Consequences:** Unexpected monthly bills in the hundreds of euros; project sustainability threatened.
**Prevention:**
- Use field masks: only request `displayName`, `formattedAddress`, `location`, `regularOpeningHours`, `priceLevel`, `websiteUri`, `nationalPhoneNumber`. Avoid `reviews`, `photos` — they trigger "Atmosphere" pricing tier (3× cost).
- Cache Place Details results in Supabase with a `places_last_fetched` timestamp; only re-fetch if older than 30 days.
- Implement `p-limit` with max 3 concurrent requests to stay well within Google's per-second quota.
- Set a hard budget cap in Google Cloud Console with alerts.
**Detection:** Google Cloud Console → Billing → API costs tab showing Places API charges above €5/month.
**Phase that must address it:** Before automating data enrichment / cron jobs.

---

### Pitfall C-3: GPS Permission Denial with No Graceful Fallback

**Severity:** HIGH
**What goes wrong:** When the user denies location permission (or is on HTTP, or using an older iOS Safari), `navigator.geolocation.getCurrentPosition` calls the error callback. If there is no fallback, the map either stays empty, shows a spinner forever, or crashes with an unhandled error. This is the most common failure mode for "near me" features in mobile web apps.
**Why it happens:** Developers test with permission always granted; they never test the denial path.
**Consequences:** The core GPS feature — the primary v1 differentiator — silently breaks for a significant user segment (iOS Safari is strict about permissions; Chrome on Android asks per-session).
**Prevention:**
- Always implement a three-state location model: `idle | loading | granted | denied | unavailable`.
- On denial: fall back to Tampere city center coordinates (61.4978°N, 23.7610°E) silently, with a subtle banner: "Sijainti ei käytettävissä — näytetään Tampere".
- On `unavailable` (GPS hardware absent, HTTPS required): same Tampere fallback.
- Never call `getCurrentPosition` on HTTP — it is blocked by browsers and will always error.
- iOS Safari requires a user gesture before triggering permission prompt; don't auto-request on page load.
**Detection:** Test with Chrome DevTools → Sensors → Location → Block.
**Phase that must address it:** GPS/location phase — must be designed with fallback from day one.

---

### Pitfall C-4: Broken URL Parameter Routing (Existing)

**Severity:** HIGH
**What goes wrong:** The codebase already has three conflicting URL param schemes: `?view=lista` (page.tsx), `?map=1` (BottomNav), and `?nakyma=kartta` (LiikuntapaikatLista). Deep links from BottomNav's Kartta tab do not actually show the map. When GPS features are added to the map view, this routing inconsistency will make it impossible to reliably deep-link to "map centered on user location."
**Why it happens:** Incremental feature additions without a routing contract.
**Consequences:** Navigation is partially broken. GPS state cannot be persisted in URL. BottomNav appears to navigate but doesn't.
**Prevention:** Standardise on `?nakyma=kartta|lista` everywhere before adding any GPS or view-state features. Update `page.tsx`, `BottomNav.tsx`, and `LiikuntapaikatLista.tsx` in one atomic change.
**Detection:** Click BottomNav "Kartta" tab → does the map view actually appear?
**Phase that must address it:** Must be the very first fix in any GPS/map phase.

---

## Moderate Pitfalls

Mistakes that degrade quality, UX, or maintainability significantly.

---

### Pitfall M-1: AI Widget Latency Killing Perceived Performance

**Severity:** MEDIUM
**What goes wrong:** The weather-based AI recommendation widget calls both Open-Meteo (for weather) and then the Claude API (for recommendation text). If both calls happen synchronously on page load, users on mobile 4G may wait 2–4 seconds before seeing any content in the widget area. Worse, if either call fails, the widget skeleton shows indefinitely (this is already the case for Open-Meteo — `.catch(() => {})` swallows errors silently).
**Why it happens:** AI API calls are inherently slow (cold start, token generation latency). Treating them like fast data fetches is a category error.
**Consequences:** The AI widget, intended as a differentiator, becomes a UX liability — a slow, sometimes broken section that users learn to ignore.
**Prevention:**
- Render the widget shell immediately with a skeleton; load AI content as a non-blocking overlay.
- Cache AI responses in `sessionStorage` keyed by `{date}_{weatherCode}` — weather changes at most hourly, AI recommendation can be the same for a whole session.
- Set a hard timeout of 8 seconds on the AI call; if exceeded, show a static fallback message ("Hyvä päivä liikuntaan!").
- Show a `"Säätietoja ei saatavilla"` text instead of infinite skeleton when Open-Meteo fails.
- Use streaming responses from Claude API if available — stream the recommendation text character-by-character for perceived speed.
**Detection:** Throttle to "Slow 3G" in Chrome DevTools; load the page and measure widget time-to-visible-content.
**Phase that must address it:** AI widget implementation phase.

---

### Pitfall M-2: AI Hallucinating Venue-Specific Data

**Severity:** MEDIUM
**What goes wrong:** If the Claude API prompt includes venue names or asks the AI to describe specific places, it may hallucinate incorrect prices, addresses, opening hours, or even claim venues exist that don't. For a directory app, factual accuracy is load-bearing — wrong data destroys trust.
**Why it happens:** LLMs do not have live database access; they pattern-match from training data which may include outdated or fictional venue details.
**Consequences:** Users show up to a venue at the wrong time, find it closed, or pay a different price. Trust loss is irreversible for local users.
**Prevention:**
- Keep AI scope strictly to weather-context recommendations: "What sport type is good in these conditions?" — never ask it about specific venues.
- Never pass venue names into the AI prompt expecting factual output about those venues.
- All venue-specific data (price, hours, address) must come exclusively from Supabase, never from AI generation.
- Clearly label AI-generated content with a badge ("AI-suositus") so users understand it is contextual advice, not directory fact.
**Detection:** Review every AI prompt template for venue name interpolation.
**Phase that must address it:** AI widget design phase.

---

### Pitfall M-3: Map Marker Performance Collapse

**Severity:** MEDIUM
**What goes wrong:** Rendering 200+ Google Maps `<Marker>` components in React causes significant frame drops on mobile devices. Each marker is a React component instance; large numbers trigger excessive reconciliation. On iOS Safari with older hardware (iPhone X era), the map becomes unresponsive above ~150 markers.
**Why it happens:** `@react-google-maps/api` wraps native Maps markers in React components, adding React overhead to what should be native canvas rendering.
**Consequences:** The map — the primary feature — becomes unusable at Tampere scale (hundreds of sports venues). This is a rewrite-level problem if discovered late.
**Prevention:**
- Implement marker clustering from the start using `@googlemaps/markerclusterer` (the official library, not the deprecated `react-google-maps` one).
- Use `AdvancedMarkerElement` (the modern Maps JS API marker) instead of legacy `Marker` — it performs better and is the current standard.
- Limit initial visible markers to those within the current viewport bounds; add a `bounds_changed` listener to load/unload markers.
- Keep the marker dataset under 300 total for v1 Tampere scope; this is manageable without virtualization.
**Detection:** Add 200+ test rows to Supabase; open the map on an old iPhone via BrowserStack.
**Phase that must address it:** Map enhancement phase (before GPS, since GPS will draw attention to the map).

---

### Pitfall M-4: Supabase Missing Geo Index

**Severity:** MEDIUM
**What goes wrong:** Proximity queries ("venues within 2km of user") require a spatial index. Without `CREATE INDEX ON liikuntapaikat USING gist(...)` or a PostGIS geography index, every "near me" query does a full table scan. At 500 rows this is imperceptible; at 5,000 rows it causes 200–500ms query latency.
**Why it happens:** The current schema was designed for list rendering, not proximity search. `latitude` and `longitude` are stored as plain float columns with no spatial awareness.
**Consequences:** GPS "near me" feature is architecturally correct but slow in production; performance degrades linearly with data growth.
**Prevention:**
- Enable PostGIS extension in Supabase: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Add a computed `location geography(POINT, 4326)` column derived from lat/lng.
- Create a GIST index: `CREATE INDEX ON liikuntapaikat USING gist(location);`
- Use `ST_DWithin(location, ST_MakePoint(lng, lat)::geography, 2000)` for proximity queries.
- Add this as a migration file in `supabase/migrations/` — the schema is currently undocumented.
**Detection:** Run `EXPLAIN ANALYZE` on a proximity query without the index; look for `Seq Scan` instead of `Index Scan`.
**Phase that must address it:** GPS/location feature phase — must be in place before any proximity querying.

---

### Pitfall M-5: Supabase Row-Level Security Gaps

**Severity:** MEDIUM
**What goes wrong:** The `liikuntapaikat` table presumably allows public reads (anon key can read all rows) and the API route does upserts with the anon key. If RLS is not explicitly configured, the anon key may have INSERT/UPDATE/DELETE rights, meaning anyone with the anon key (which is public in the client bundle) can modify the venue database directly via Supabase client.
**Why it happens:** Supabase's default is "no RLS" = full access with any valid key. The anon key is NEXT_PUBLIC and therefore visible to all users.
**Consequences:** Malicious users can delete all venues, inject fake venues, or corrupt pricing data.
**Prevention:**
- Enable RLS on `liikuntapaikat` immediately: `ALTER TABLE liikuntapaikat ENABLE ROW LEVEL SECURITY;`
- Add a policy: `CREATE POLICY "public read" ON liikuntapaikat FOR SELECT USING (true);`
- Upserts should use the service role key (server-only), never the anon key.
- The API route (`hae-paikat`) should use `SUPABASE_SERVICE_ROLE_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for writes.
**Detection:** Open browser console, run `supabase.from('liikuntapaikat').delete().eq('id', 1)` — if it succeeds, RLS is not protecting data.
**Phase that must address it:** Before any public launch or data enrichment automation.

---

### Pitfall M-6: N+1 Queries in Data Fetching

**Severity:** MEDIUM
**What goes wrong:** The Google Places API route already does N parallel Detail calls (one per result). As features expand, a similar pattern may emerge in Supabase queries: fetching a venue list, then fetching related data (opening hours, categories, images) in a loop per venue.
**Why it happens:** Incremental feature additions without an explicit data loading strategy.
**Consequences:** Supabase quota exhaustion, slow page loads, excessive API usage.
**Prevention:**
- Use Supabase's `select` with joins or embed related tables in a single query.
- For Google Places: use `p-limit` (already documented in CONCERNS.md) with max 3–5 concurrent requests, not unbounded `Promise.all`.
- Design the Supabase schema so all card-rendering data is in one row (no join required for list view).
**Detection:** Add query logging to Supabase; count queries per page load.
**Phase that must address it:** Data model / schema phase.

---

### Pitfall M-7: GDPR and Finnish Privacy Law for GPS Data

**Severity:** MEDIUM
**What goes wrong:** Collecting, processing, or storing users' GPS coordinates without a valid legal basis and privacy policy violates GDPR (EU 2016/679), which applies in Finland. Even client-side-only location use requires informing users. If location data is ever logged server-side (e.g., in analytics, API logs, or error tracking), a data processing record is legally required.
**Why it happens:** Developers treat GPS as a technical feature, not a data processing activity.
**Consequences:** Finnish Data Protection Ombudsman (Tietosuojavaltuutettu) can issue fines up to €20M or 4% of global annual turnover. More practically, Finnish users are privacy-aware and will notice missing privacy policy.
**Prevention:**
- Process GPS exclusively client-side: coordinates are used to center the map and sort venues, never sent to the server or stored.
- If any server-side location logging is added (even for analytics), add a privacy policy page and a cookie/consent banner.
- Open-Meteo does not require GPS coordinates server-side — use the client-detected coordinates only for the map center.
- Add a `tietosuoja` (privacy) page before public launch explaining what data is collected.
**Detection:** Audit every API call and analytics event for coordinate parameters.
**Phase that must address it:** Before any public marketing or user acquisition.

---

### Pitfall M-8: Google Maps Double-Load and Flash of Loading State

**Severity:** MEDIUM  
**What goes wrong:** Both `Etusivu.tsx` and `Kartta.tsx` call `useJsApiLoader` independently. When switching between list and map views, the Maps script re-initialises its load state, causing a brief flash of the loading placeholder even though the script is already loaded.
**Why it happens:** No shared Maps context — each component manages its own load state.
**Consequences:** Visible flash / janky transition exactly when switching to the map view — the primary feature interaction.
**Prevention:**
- Extract a `GoogleMapsProvider` wrapper that calls `useJsApiLoader` once at the app level.
- All map components consume `useGoogleMapsContext()` instead of calling the loader themselves.
- This also resolves the technical debt already flagged in CONCERNS.md.
**Detection:** Add a `console.log` to `useJsApiLoader`'s `onLoad` callback; switch views repeatedly and count how many times it fires.
**Phase that must address it:** Map enhancement phase.

---

## Minor Pitfalls

Mistakes that cause maintenance pain or polish issues without blocking features.

---

### Pitfall L-1: Finnish Address Formatting from Google Places

**Severity:** LOW
**What goes wrong:** Google Places returns Finnish addresses in `"Street Name 1, 33100 Tampere, Finland"` format. Finnish convention on street addresses omits the country for domestic display and prefers `"Katuosoite 1, Tampere"` without postal code for informal contexts. The current `parseOsoite` function may strip or reformat incorrectly.
**Prevention:** Define a canonical address format for the app and run unit tests against real Google Places responses from Tampere. The function is already flagged as untested in CONCERNS.md.
**Phase:** Data enrichment phase.

---

### Pitfall L-2: Stale Venue Data (Closed Businesses, Wrong Hours)

**Severity:** LOW (becomes MEDIUM at scale)
**What goes wrong:** Sports venues close, change hours, move locations, or go out of business. Google Places data itself can be stale. A venue marked open in Supabase that is actually closed creates a trust-destroying experience for users.
**Prevention:**
- Add a `data_last_verified` timestamp to the schema.
- Show a "Tiedot voivat olla vanhentuneita" disclaimer on venues not refreshed in 90+ days.
- Build an admin flag (`is_active: boolean`) so closed venues can be hidden without deletion.
- For v1 Tampere scope, plan a monthly manual review of the top 50 venues.
**Phase:** Data model phase; admin tools later.

---

### Pitfall L-3: `any` Type Casts Masking Data Shape Bugs

**Severity:** LOW
**What goes wrong:** TypeScript `any` casts in the API route and components mean type errors from malformed Google Places responses are not caught at compile time. A Places API response schema change (Google occasionally updates field names) would cause runtime crashes instead of type errors.
**Prevention:**
- Define `type PlaceDetailsResponse` matching the actual API response shape.
- Use `zod` to parse and validate API responses at the boundary.
- Remove all `any` casts incrementally; this is safe to do one function at a time.
**Phase:** Can be addressed in any refactoring pass; prioritise `detectLaji` and `parseOsoite` first.

---

### Pitfall L-4: Sport Type Detection Gaps

**Severity:** LOW
**What goes wrong:** `padel` and `jooga` venues cannot be detected from Google Places types alone — they have no matching `types[]` entry. They fall back to the generic `liikunta` category and never appear under their sport filter.
**Why it happens:** Google Places types do not have fine-grained sport subcategories.
**Prevention:**
- Add name-based heuristics: `/padel/i`, `/jooga|yoga/i`, `/kuntosali|gym/i` as fallback pattern matching on the venue name.
- Allow manual `laji` override in the database so curated venues always show under the correct filter.
**Phase:** Data enrichment / sport type accuracy phase.

---

### Pitfall L-5: Missing Error Boundaries Causing Full-Page Crashes

**Severity:** LOW (catastrophic when triggered)
**What goes wrong:** If Framer Motion, `@react-google-maps/api`, or a malformed Supabase record causes a runtime error, the entire page goes blank with React's default error screen (or nothing, if no error boundary exists). No `app/error.tsx` or `app/loading.tsx` exist currently.
**Prevention:**
- Add `app/error.tsx` (Next.js App Router built-in error boundary) as an immediate fix.
- Add `app/loading.tsx` with a skeleton to prevent blank page during SSR data fetch.
- Wrap the AI widget specifically in a local error boundary — it's the highest-risk component.
**Phase:** First phase of any work — this is a zero-cost fix that prevents catastrophic UX.

---

### Pitfall L-6: No Pagination Degrading at Scale

**Severity:** LOW now, HIGH at 500+ venues
**What goes wrong:** All venues are fetched in a single Supabase query with no `limit()`. At Tampere scale (~200–400 venues), this sends 50–100KB of JSON on every page load. Mobile users on slow connections pay this cost on every navigation.
**Prevention:**
- Implement cursor-based pagination or `range()` with a page size of 50.
- Move sport-type and price filtering to the Supabase query (`ilike`, `gte`, `lte`) instead of client-side JavaScript.
- Add a Supabase index on `laji` column: `CREATE INDEX ON liikuntapaikat(laji);`
**Phase:** Can defer to post-MVP, but design the API layer to support pagination from day one.

---

### Pitfall L-7: `tw-animate-css` Package Conflict Time Bomb

**Severity:** LOW
**What goes wrong:** `tw-animate-css` is installed as a production dependency but is a Tailwind v4 plugin — incompatible with this project's Tailwind v3. If any future developer imports it in `globals.css`, it silently breaks all styles.
**Prevention:** Remove from `package.json` immediately. It is already documented as unused in CONCERNS.md.
**Phase:** Housekeeping — any phase.

---

## Phase-Specific Warnings

| Phase Topic | Most Likely Pitfall | Mitigation |
|-------------|-------------------|------------|
| GPS / "near me" feature | Permission denial with no fallback (C-3) | Three-state location model from design start |
| GPS / "near me" feature | URL routing inconsistency blocking deep links (C-4) | Fix URL params before touching map code |
| GPS / "near me" feature | Missing spatial index causes slow proximity queries (M-4) | Add PostGIS migration before first geo query |
| Map enhancement | Marker performance collapse on mobile (M-3) | Implement clustering before adding more markers |
| Map enhancement | Maps double-load flash (M-8) | Shared GoogleMapsProvider from the start |
| AI recommendations | Widget latency killing UX (M-1) | Non-blocking skeleton + session cache + hard timeout |
| AI recommendations | Hallucinated venue facts (M-2) | Strict prompt scope — weather context only, no venue data |
| Data enrichment / cron | API cost explosion from Place Details (C-2) | Field masks + 30-day cache + billing alerts |
| Data enrichment / cron | Unauthenticated ingestion endpoint (C-1) | Admin secret or cron-only before any automation |
| Data enrichment | Finnish address format bugs (L-1) | Unit tests against real Tampere Places responses |
| Data enrichment | Sport type detection gaps (L-4) | Name-based heuristics as fallback |
| Any phase | No error boundaries (L-5) | Add error.tsx and loading.tsx in first PR |
| Any phase | RLS not enforced (M-5) | Enable RLS + policies before any public data |
| Any phase | GDPR compliance (M-7) | Location client-side only; privacy page before launch |

---

## Sources

- Codebase analysis: `C:\ClaudeCodeTestit\liikuntahakemisto\.planning\codebase\CONCERNS.md` (2026-05-19)
- Project requirements: `C:\ClaudeCodeTestit\liikuntahakemisto\.planning\PROJECT.md` (2026-05-19)
- Next.js middleware/proxy docs: https://nextjs.org/docs/app/building-your-application/routing/middleware (confirmed current, v16.x)
- Google Places API field masks and billing tiers: HIGH confidence from API documentation patterns and CONCERNS.md cost analysis
- GDPR / Finnish Tietosuojavaltuutettu: HIGH confidence — EU regulation applies to all Finnish-market apps
- PostGIS geo indexing patterns: HIGH confidence — standard Postgres/PostGIS pattern, Supabase supports natively
- Browser Geolocation API quirks (iOS Safari, HTTP block): HIGH confidence — well-documented browser constraints
- AI recommendation latency and hallucination risks: HIGH confidence — inherent LLM characteristics, not library-specific
