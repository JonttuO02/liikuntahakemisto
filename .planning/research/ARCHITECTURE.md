# Architecture Patterns

**Domain:** Finnish sports venue discovery app (location-aware, weather-informed, AI-assisted)
**Researched:** 2026-05-19
**Overall confidence:** HIGH — based on direct codebase analysis + verified Next.js 14 and Supabase documentation

---

## Current Architecture (as-built)

```
Browser
  └── Next.js App Router (Next 14, SSR)
        ├── app/page.tsx (server component, SSR)
        │     └── supabase.from('liikuntapaikat').select(...).order('nimi')
        │           ├── → <Etusivu paikat={data} />    (default view)
        │           └── → <LiikuntapaikatLista paikat={data} />  (?view=lista)
        │
        ├── app/paikat/[id]/page.tsx (server component, SSR per request)
        │
        └── app/api/hae-paikat/route.ts  (admin-only, manual trigger)
              Google Places Text Search → Place Details (parallel)
              → supabase.upsert(rivit, { onConflict: 'place_id' })

Client components (all 'use client'):
  Etusivu.tsx        — scroll-driven map expand, weather widget (Open-Meteo), filter pills
  LiikuntapaikatLista.tsx — list/map toggle, text search, sport/price filters
  PaikkaKortti.tsx   — venue card
  Kartta.tsx         — standalone Google Map (lazy-loaded)
  NavBar.tsx / BottomNav.tsx

External APIs:
  Supabase (Postgres) — venue data store
  Google Maps JS API  — map rendering (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  Google Places API   — data ingestion only (GOOGLE_PLACES_API_KEY, server-only)
  Open-Meteo          — weather, fetched client-side in Etusivu useEffect
```

Current Supabase schema (inferred from select queries and upsert payload):
```
liikuntapaikat
  id            serial PK
  place_id      text UNIQUE  -- Google Places ID, upsert conflict key
  nimi          text
  laji          text         -- sport slug: 'kuntosali', 'uinti', 'padel', etc.
  osoite        text
  kaupunki      text
  latitude      float8
  longitude     float8
  hinta_min     numeric
  hinta_max     numeric
  varauslinkki  text
  kuvaus        text
  puhelin       text
```

---

## Question 1: GPS Architecture — Server vs Client, URL vs State

**Answer: Client-only via `navigator.geolocation`, stored in React state, NOT in URL.**

**Rationale (from Next.js official docs):**
Browser-only APIs — including `Navigator.geolocation` — cannot run in server components. There is no server-side GPS; the server has no access to the user's physical location. GPS must live in a client component.

**Decision: React state, not URL params.**

URL params are appropriate for shareable/bookmarkable state (view mode, filters). GPS coordinates should NOT go in the URL because:
1. The location changes on every visit and is personal — sharing a GPS-parameterized URL would expose the user's location to the recipient.
2. The Geolocation API is permission-gated and async — there is no value to read from the URL before permission is granted.
3. Coordinates in URLs create ugly, non-shareable URLs.

GPS state belongs in the component that owns the map. That is `Etusivu.tsx`.

**Implementation pattern:**

```tsx
// Inside Etusivu.tsx (already 'use client')

type GpsStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle')
const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

function requestGps() {
  if (!navigator.geolocation) {
    setGpsStatus('unavailable')
    return
  }
  setGpsStatus('requesting')
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setGpsStatus('granted')
    },
    () => setGpsStatus('denied'),
    { timeout: 8000, maximumAge: 60_000 }
  )
}
```

**No-GPS graceful degradation:**
- `idle`: Show "Käytä sijaintiani" button (GPS never requested).
- `requesting`: Show spinner on the button, disable it.
- `granted`: Show blue dot on map, center map on user, show nearby venues first.
- `denied`: Show subtle inline message "Sijaintia ei saatu — näytetään Tampere" — do NOT block the UI or show modal.
- `unavailable`: Same as `denied`. Fall back silently to Tampere center coordinates.

**User marker on map:** Render a distinct marker (blue circle with white ring, distinct from venue indigo markers) at `userLocation`. Do not use `google.maps.SymbolPath.CIRCLE` with the same style as venues — users must instantly distinguish "this is me" from "this is a venue."

**Distance sorting:** Once GPS is granted, sort `suodatettu` venues by distance from `userLocation` using the Haversine formula (a ~10-line pure function in `lib/utils.ts`). This replaces the current `order('nimi')` ordering in the client-side filter memo. The SSR sort-by-name remains as the initial state before GPS.

---

## Question 2: AI Weather Recommendation Pipeline

**Answer: Weather fetch is client-side (already is). AI call must be an API Route. Render is client-side with skeleton states.**

**Why the AI call must be an API Route:**
The Claude API key is secret — it must never appear in client bundle or browser network tabs. Next.js only hides environment variables from the client bundle if they are NOT prefixed with `NEXT_PUBLIC_`. The AI call must happen server-side. API Routes are the correct mechanism in App Router for this: they run in Node.js, have access to non-prefixed env vars, and can be called by client components via `fetch('/api/...')`.

**Why NOT SSR (server component) for the AI widget:**
SSR renders at request time on the server. To SSR the AI recommendation, `app/page.tsx` would need to:
1. Fetch weather from Open-Meteo (server-side).
2. Call Claude with weather data.
3. Block the entire page render on the AI response.

This would add 500–2000ms to Time-To-First-Byte for every page load. The weather widget is progressive enhancement — it should not gate the rest of the page. Client-side fetch with skeleton state is the correct pattern here.

**Pipeline flow:**

```
Etusivu mounts (client)
  │
  ├── useEffect #1: fetch Open-Meteo (direct, public API, no key needed)
  │     → setSaa({ temp, code })
  │     → show weather icon + temp immediately
  │
  └── useEffect #2: triggered once saa is set
        fetch('/api/saa-suositus', { method: 'POST', body: JSON.stringify({ temp, code }) })
          │
          └── app/api/saa-suositus/route.ts (server)
                Calls Claude API with CLAUDE_API_KEY (non-public env var)
                Prompt: "Given weather code {code} and temp {temp}°C in Tampere,
                         recommend ONE specific sport activity in Finnish. 1 sentence."
                Returns: { suositus: "Tänään sopii erinomaisesti..." }
          │
          └── setSuositus(data.suositus)
                Replace current hard-coded parseSaa() suggestion with AI text
```

**Skeleton states (already partially implemented):**
- Weather loading: animated pulse divs already in Etusivu.tsx — keep as-is.
- AI suggestion loading: show the hard-coded `parseSaa()` suggestion as immediate fallback, then replace with AI text when it arrives. This means users always see something useful, never a blank widget.

**Latency budget:**
- Open-Meteo: ~100–200ms
- Claude API: ~500–1500ms
- Total before AI widget is "complete": ~700–1700ms from mount

Show Open-Meteo data immediately. Show AI text as progressive enhancement. Never block.

**New API route to create:**
```
app/api/saa-suositus/route.ts
  POST body: { temp: number, code: number }
  Calls Claude API (Anthropic SDK or direct fetch)
  Returns: { suositus: string }
  Error: returns parseSaa() fallback text so client always has something
```

**Environment variable to add:**
```
CLAUDE_API_KEY=sk-ant-...   (server-only, no NEXT_PUBLIC_ prefix)
```

---

## Question 3: Supabase Schema Changes

### New columns for `liikuntapaikat`

Add via Supabase SQL editor (ALTER TABLE). The upsert in `hae-paikat/route.ts` will continue to work — new columns not in the upsert payload will default to NULL without conflict.

```sql
-- Drop-in pricing (kertakäyntihinta)
-- hinta_min and hinta_max already exist, covers the core case.
-- Add a text label for when price is not numeric (e.g. "Jäsenmaksu vaaditaan"):
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS hinta_kuvaus text;

-- Opening hours (aukioloajat)
-- Use JSONB for structured weekly schedule.
-- Structure: { "ma": "06:00-22:00", "ti": "06:00-22:00", ... "su": "suljettu" }
-- JSONB is queryable if needed later; text is not.
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS aukioloajat jsonb;

-- Sport category (for future multi-sport venues)
-- Current 'laji' is a single text slug. Keep it — it drives filtering.
-- Add 'lajit_lista' as jsonb array for venues that serve multiple sports.
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS lajit_lista jsonb;  -- e.g. ["padel", "tennis", "kuntosali"]

-- Is currently open? (computed field, not stored — derive from aukioloajat client-side)
-- Do NOT add an 'avoinna_nyt' boolean column — it would be stale immediately.
-- Compute it in the client from aukioloajat + current time.

-- Ad slot / featured flag (mainostila)
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS featured_expires_at timestamptz;
```

### Updated `Liikuntapaikka` TypeScript type

Move from `LiikuntapaikatLista.tsx` to `lib/types.ts` (fixes existing anti-pattern):

```typescript
// lib/types.ts
export type AukioloajatMap = Partial<Record<
  'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su',
  string  // "09:00-21:00" | "suljettu"
>>

export type Liikuntapaikka = {
  id: number
  place_id: string | null
  nimi: string
  laji: string
  lajit_lista: string[] | null      // new: multi-sport
  osoite: string | null
  kaupunki: string | null
  latitude: number | null
  longitude: number | null
  hinta_min: number | null
  hinta_max: number | null
  hinta_kuvaus: string | null       // new: "Jäsenmaksu vaaditaan"
  aukioloajat: AukioloajatMap | null  // new: weekly schedule
  varauslinkki: string | null
  kuvaus: string | null
  puhelin: string | null
  featured: boolean                  // new: ad slot
  featured_expires_at: string | null // new: ISO timestamp
}
```

### Updated SSR Supabase select query

```typescript
// app/page.tsx
await supabase
  .from('liikuntapaikat')
  .select(`
    id, place_id, nimi, laji, lajit_lista,
    osoite, kaupunki, latitude, longitude,
    hinta_min, hinta_max, hinta_kuvaus,
    aukioloajat,
    varauslinkki, kuvaus, puhelin,
    featured, featured_expires_at
  `)
  .order('featured', { ascending: false })  // featured venues first
  .order('nimi')
```

---

## Question 4: Performance — Lazy Loading, Skeletons, Optimistic GPS

### Map lazy loading (already implemented correctly)

`Kartta.tsx` in `LiikuntapaikatLista` is already lazy-loaded via `React.lazy` + `Suspense`. Do not change this pattern.

The `Etusivu.tsx` map (`@react-google-maps/api` `GoogleMap`) is NOT lazy-loaded — it loads the Maps JS bundle eagerly on the home page. This is acceptable because the map is the primary feature of `Etusivu`. However, the `useJsApiLoader` hook already handles the async load gracefully (renders a pulse skeleton while `isLoaded` is false).

### Skeleton states

Current skeleton in `Etusivu` covers weather. Extend this pattern:
- GPS button: show "Käytä sijaintiani" immediately (no GPS latency to wait for).
- AI widget: show `parseSaa()` text immediately, replace with Claude response when ready — never show an empty `<p>` or spinner where text will appear.
- Opening hours: show "Ladataan..." only if data is expected but missing. If `aukioloajat` is NULL in the database, show "Aukioloajat tulossa" inline — never a spinner for missing data.

### Optimistic GPS pattern

Do NOT make the GPS request on mount automatically. Users must opt in by tapping a button. Browser permission dialogs that appear without user interaction are jarring and often dismissed — resulting in a permanent `denied` state that cannot be re-requested without the user going to browser settings.

Pattern:
1. On mount: render "Käytä sijaintiani" button (no GPS request yet).
2. On button tap: call `requestGps()`, show spinner on button.
3. On permission grant: remove button, show blue dot on map, sort venues by distance.
4. On permission deny: show subtle "Sijainti ei käytettävissä" text near the button area, fall back to Tampere center.

### Venue card "open now" indicator

Compute `isAvoinnaNyt(aukioloajat: AukioloajatMap | null): boolean` in `lib/utils.ts`. This is a pure function — no hooks needed. Called during card rendering. Shows a green "Auki" or gray "Suljettu" badge on `PaikkaKortti`. Do not store this in state — recompute on each render (cheap operation).

---

## Question 5: Data Pipeline Architecture

### Current pipeline (as-built)

```
Manual trigger: GET /api/hae-paikat
  → Google Places Text Search "liikuntapaikat Tampere" (15km radius)
  → Promise.all: Place Details for website + phone
  → supabase.upsert(rivit, { onConflict: 'place_id' })
```

### Gaps and recommended extensions

**Gap 1: Opening hours not fetched from Google**
Google Place Details API returns `opening_hours.periods` — structured weekly schedule. The current `fetchPlaceDetails()` only fetches `website,formatted_phone_number`. Extend to also request `opening_hours` and map it to the `aukioloajat` JSONB structure.

```typescript
// In fetchPlaceDetails(), add to fields:
url.searchParams.set('fields', 'website,formatted_phone_number,opening_hours')

// Then parse periods:
function parseAukioloajat(periods: google.maps.PlaceOpeningHoursPeriod[]): AukioloajatMap {
  // Map Google's numeric day (0=Sunday) to Finnish abbreviations
  // periods[].open.time: "0900", periods[].close.time: "2100"
}
```

**Gap 2: Manual enrichment workflow**
Kertakäyntihinta will NOT come from Google — it requires direct outreach to venues. Recommended workflow:

1. Run `/api/hae-paikat` to auto-populate all Google-available fields.
2. Use Supabase Table Editor (dashboard) to manually fill `hinta_min`, `hinta_max`, `hinta_kuvaus` row by row.
3. Alternatively, build a minimal admin form at `/admin/paika/[id]/muokkaa` (a protected page, POST to a new API route) — but this is scope creep for v1. Use the Supabase dashboard.

**Gap 3: Multi-query ingestion**
Current single query ("liikuntapaikat Tampere") misses specialized venues. Add multiple targeted queries:

```typescript
const HAKU_KYSELYT = [
  'liikuntapaikat Tampere',
  'kuntosali Tampere',
  'uimahalli Tampere',
  'padel Tampere',
  'tennis Tampere',
  'jooga Tampere',
  'liikuntahalli Tampere',
]
```

Run sequentially (not in parallel — Places API rate limits) and deduplicate by `place_id` before upsert.

**Recommended pipeline architecture (extended):**

```
app/api/hae-paikat/route.ts (extended)
  ├── Loop over HAKU_KYSELYT (sequential)
  │     Google Places Text Search per query
  │     Collect all results, deduplicate by place_id
  ├── Promise.all: Place Details (website, phone, opening_hours) per unique place
  ├── Map opening_hours → AukioloajatMap
  └── supabase.upsert(rivit, { onConflict: 'place_id', ignoreDuplicates: false })
        ignoreDuplicates: false → always update existing rows with fresher data
```

---

## Component Boundaries (new features)

```
app/page.tsx (server)
  Supabase query (extended columns)
  → <Etusivu paikat={data} />

Etusivu.tsx (client)
  ├── GPS state (useState: idle/requesting/granted/denied/unavailable)
  ├── userLocation state (useState: {lat, lng} | null)
  ├── saa state (useState: SaaTiedot | null)           — Open-Meteo
  ├── suositus state (useState: string | null)          — Claude AI response
  ├── Weather fetch (useEffect → Open-Meteo direct)
  ├── AI fetch (useEffect → POST /api/saa-suositus when saa is set)
  ├── GPS request function (called on button tap only)
  ├── Distance-sorted venues (useMemo, depends on userLocation + suodatettu)
  └── GoogleMap
        ├── Venue markers (indigo)
        └── User location marker (blue, only if gpsStatus === 'granted')

app/api/saa-suositus/route.ts (NEW — server API route)
  POST { temp: number, code: number }
  → Claude API (CLAUDE_API_KEY env var, server-only)
  → return { suositus: string }

lib/types.ts (NEW — move Liikuntapaikka type here)

lib/utils.ts (extend)
  ├── hintateksti() — move from 3 component files
  ├── haversineEtaisyys(a, b) — distance calculation
  └── isAvoinnaNyt(aukioloajat) — "open now" checker
```

**Communication direction (one-way, no circular dependencies):**
```
app/page.tsx → Etusivu.tsx (props: paikat)
Etusivu.tsx → Open-Meteo (fetch, direct)
Etusivu.tsx → /api/saa-suositus (fetch POST)
app/api/saa-suositus → Claude API (server fetch)
app/api/hae-paikat → Google Places API (server fetch)
app/api/hae-paikat → Supabase (upsert)
app/page.tsx → Supabase (read, server component)
```

---

## Architectural Constraints and Rules

### What must stay client-side (browser APIs)
- `navigator.geolocation` — always client, always user-initiated
- `@react-google-maps/api` GoogleMap — always client
- Framer Motion animations — always client
- `useSearchParams`, `useRouter` — always client
- Open-Meteo weather fetch (currently in useEffect — this is fine, it is a public API)

### What must stay server-side (secret keys)
- `GOOGLE_PLACES_API_KEY` — already server-only (no NEXT_PUBLIC_ prefix), used only in `/api/hae-paikat`
- `CLAUDE_API_KEY` — new, must be server-only, only accessed in `/api/saa-suositus`
- Supabase anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — public read is safe for anon key with RLS; this is the current and correct pattern

### State management rule
No global state store. GPS state, weather state, and AI suggestion state all live in `Etusivu.tsx` — they are logically cohesive (all feed the same widget and map). Only push state to URL if it must survive navigation or be shareable (current: view mode via `?nakyma=kartta`). GPS and weather are ephemeral per session.

---

## Build Order Implications (Feature Dependencies)

The following dependency graph determines implementation order:

```
1. lib/types.ts (move Liikuntapaikka type)
   ← Blocks: all components that import this type

2. Supabase schema migration (ALTER TABLE)
   ← Blocks: showing hinta_kuvaus, aukioloajat, featured in UI

3. lib/utils.ts extensions (hintateksti, haversineEtaisyys, isAvoinnaNyt)
   ← Blocks: GPS distance sort, open-now badge, price display refactor

4. GPS in Etusivu.tsx
   ← Depends on: lib/utils.ts (haversineEtaisyys)
   ← Blocks: "nearby venues" sort, user marker on map

5. Opening hours in hae-paikat/route.ts
   ← Depends on: Supabase schema migration
   ← Blocks: showing real aukioloajat data on cards

6. Opening hours display in PaikkaKortti + detail page
   ← Depends on: Supabase schema migration, lib/utils.ts (isAvoinnaNyt)

7. app/api/saa-suositus/route.ts (Claude AI endpoint)
   ← Depends on: CLAUDE_API_KEY env var
   ← Blocks: AI-generated recommendation text

8. AI widget upgrade in Etusivu.tsx
   ← Depends on: /api/saa-suositus route

9. Featured/ad slot display in LiikuntapaikatLista + Etusivu
   ← Depends on: Supabase schema migration
   ← This is a standalone feature, no ordering constraint relative to GPS/AI
```

**Recommended phase sequence based on dependency graph:**

- **Phase A (Foundation):** lib/types.ts + lib/utils.ts + Supabase migration. No UI changes yet. Unblocks everything else.
- **Phase B (Data enrichment):** Extend hae-paikat to fetch opening hours; manual hinta enrichment via Supabase dashboard.
- **Phase C (GPS):** GPS detection in Etusivu, user marker, distance sort, graceful deny state.
- **Phase D (AI widget):** /api/saa-suositus + AI text in Etusivu, replacing hard-coded parseSaa suggestions.
- **Phase E (UI enrichment):** Opening hours display on cards + detail page; hinta_kuvaus display; open-now badge.
- **Phase F (Ad slots):** Featured flag UI in list and home views.

---

## Anti-Patterns to Avoid in New Features

### Do not put GPS coordinates in URL params
**Why bad:** Exposes user location in browser history, sharing links, server logs. Location is personal and ephemeral — it has no value in the URL.

### Do not call Claude API from client component directly
**Why bad:** API key would appear in browser network tab. Any user can see it, rotate it, and burn API credits.

### Do not SSR the AI widget
**Why bad:** Blocks Time-To-First-Byte by 500–2000ms on every home page load. The AI suggestion is enhancement, not core content.

### Do not auto-request GPS on mount
**Why bad:** Browser permission prompt without user intent → high dismiss rate → permanent `denied` state. Users can never re-grant without going to browser settings manually.

### Do not store `avoinna_nyt` as a database column
**Why bad:** It becomes stale the moment it is written. Derive it at render time from `aukioloajat` + `new Date()`.

### Do not define `Liikuntapaikka` type in a UI component file (existing anti-pattern)
**Why bad:** Creates circular-looking import dependency where `Etusivu.tsx` imports a type from `LiikuntapaikatLista.tsx`. Move to `lib/types.ts` as part of Phase A.

### Do not duplicate `hintateksti()` across three files (existing anti-pattern)
**Why bad:** Price formatting logic must be changed in three places if requirements change. Consolidate in `lib/utils.ts` as part of Phase A.

---

## Scalability Considerations

| Concern | At current scale (< 200 venues) | At larger scale (> 2000 venues) |
|---------|----------------------------------|----------------------------------|
| SSR full-table fetch | Fine — fast query, small payload | Add pagination or bounding-box filter |
| Client-side filter (useMemo) | Fine — 200 items is trivial | Still fine up to ~5000; beyond that, move to server-side filtered queries |
| GPS distance sort | O(n) — trivial | O(n log n) with sort — still fast at 5000 |
| Claude API calls | 1 call per Etusivu mount | Consider caching response per (code, temp) pair in Supabase or KV for 30min |
| Google Places ingestion | Single run, ~20 results | Multiple queries × 20 results — add rate limit handling + pagination |

---

## Sources

- Next.js official docs: Server and Client Components (verified 2026-05-18, version 16.2.6): https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js official docs: Route Handlers (verified 2026-05-18): https://nextjs.org/docs/app/api-reference/file-conventions/route
- Direct codebase analysis: `app/components/Etusivu.tsx`, `app/api/hae-paikat/route.ts`, `app/page.tsx`, `lib/lajit.ts`, `package.json` — HIGH confidence (first-hand source)
- `navigator.geolocation` browser API: standard Web API, works in all modern browsers (Chrome, Safari, Firefox) with HTTPS. No library required.
- Open-Meteo API: free, no API key required, public endpoint — used correctly as-is
- Supabase upsert with `onConflict`: already in use in `hae-paikat/route.ts`, pattern is validated
