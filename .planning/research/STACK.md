# Technology Stack

**Project:** Liikuntahakemisto
**Researched:** 2026-05-19
**Confidence:** HIGH (core stack verified via Context7 official docs; GPS/geolocation pattern verified via MDN + Supabase docs)

---

## Verdict on Existing Stack

**Keep everything.** The current stack (Next.js 14 App Router, React 18, TypeScript strict, Tailwind v3, Framer Motion, Supabase, Google Maps/Places, Open-Meteo) is correct for a Finnish venue discovery PWA. No core replacements needed. The work is additive: upgrade one library, add three new integrations, and enable one Supabase extension.

---

## Recommended Stack (Full Picture)

### Core Framework — KEEP

| Technology | Version | Purpose | Decision |
|------------|---------|---------|----------|
| Next.js | 14.2.35 | App Router, RSC, API Routes | Keep — constraint per PROJECT.md |
| React | 18.x | Concurrent rendering, Suspense | Keep |
| TypeScript | ^5 strict | Type safety | Keep |
| Tailwind CSS | ^3.4.1 | Styling | Keep — v4 incompatible with this codebase |
| Framer Motion | ^12.38.0 | Animations | Keep — Emil Kowalski philosophy already implemented |

**Confidence:** HIGH — verified against codebase + Context7.

---

### Map Library — MIGRATE from `@react-google-maps/api` to `@vis.gl/react-google-maps`

| Library | Version | Decision |
|---------|---------|----------|
| `@vis.gl/react-google-maps` | ^1.x | **Replace** `@react-google-maps/api` 2.20.8 |

**Why migrate:**
- `@react-google-maps/api` is community-maintained and has been in maintenance mode. `@vis.gl/react-google-maps` is the actively developed successor, built and maintained by the vis.gl team (Google Maps Platform partners).
- `@vis.gl/react-google-maps` provides `APIProvider` (replaces `useJsApiLoader`/`LoadScript`), `AdvancedMarker` (replaces deprecated `Marker`), `useMapsLibrary` hook for dynamic library loading, and first-class TypeScript types.
- `AdvancedMarker` supports custom React JSX as pin content — essential for the Wolt-style venue pins the design requires.
- Migration path is straightforward: `useJsApiLoader` → `APIProvider` wrapper, `Marker` → `AdvancedMarker`, `InfoWindow` → `InfoWindow` (same name, slightly different props).
- The existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` remains unchanged.

**Migration scope:** ~2 files (`app/components/Kartta.tsx`, `app/components/Etusivu.tsx`). Not a rewrite — a targeted swap.

**Confidence:** HIGH — verified via Context7 official vis.gl docs including migration guide.

**Do NOT use:**
- Mapbox GL JS / react-map-gl — adds a paid tile layer dependency and abandons the existing Google Maps investment (Places API, custom styles already configured).
- Leaflet — no native clustering for 100+ markers, poor mobile gesture handling vs Google Maps.

---

### GPS / Geolocation — Browser API + Supabase PostGIS

**Decision: Use the browser's native `navigator.geolocation` API directly. No third-party library needed.**

The Web Geolocation API (`navigator.geolocation.getCurrentPosition` / `watchPosition`) is production-ready, has universal browser support, requires no dependencies, and returns the same accuracy as any wrapper library (accuracy is determined by device hardware and browser policy, not the JS layer).

**Implementation pattern (custom hook):**

```typescript
// lib/hooks/useGeolocation.ts
import { useState, useEffect } from 'react'

interface GeolocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: null, lng: null, accuracy: null, error: null, loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setState({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        error: null,
        loading: false,
      }),
      (err) => setState(s => ({ ...s, error: err.message, loading: false })),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    )
  }, [])

  return state
}
```

**Why no library:**
- `react-use` geolocation hook adds a 100kB+ dependency for a 15-line hook.
- React Native geolocation packages (Capacitor, transistorsoft) are mobile-only — not applicable to a web app.
- Browser API has been stable since Chrome 5 / Firefox 3.5. All modern Finnish mobile browsers support it.

**Supabase PostGIS for "nearby venues" queries:**

Enable the `postgis` extension and add a `location geography(POINT)` column to `liikuntapaikat`. Create a `nearby_liikuntapaikat` RPC function:

```sql
create extension if not exists postgis with schema extensions;

-- Add geography column (migration)
alter table public.liikuntapaikat
  add column if not exists location extensions.geography(POINT);

-- Populate from existing lat/lng columns
update public.liikuntapaikat
  set location = extensions.st_point(longitude, latitude)::extensions.geography
  where latitude is not null and longitude is not null;

-- Nearby function
create or replace function nearby_liikuntapaikat(lat float, long float, radius_m float default 5000)
returns table (
  id int, nimi text, laji text, osoite text,
  latitude float, longitude float, varauslinkki text,
  hinta_min numeric, hinta_max numeric,
  dist_meters float
)
set search_path = ''
language sql as $$
  select id, nimi, laji, osoite, latitude, longitude, varauslinkki, hinta_min, hinta_max,
    extensions.st_distance(location, extensions.st_point(long, lat)::extensions.geography) as dist_meters
  from public.liikuntapaikat
  where extensions.st_dwithin(location, extensions.st_point(long, lat)::extensions.geography, radius_m)
  order by location operator(extensions.<->) extensions.st_point(long, lat)::extensions.geography;
$$;
```

Client call:
```typescript
const { data } = await supabase.rpc('nearby_liikuntapaikat', {
  lat: userLat,
  long: userLng,
  radius_m: 5000,
})
```

**Confidence:** HIGH — PostGIS pattern verified against Supabase official docs and Context7.

---

### AI Weather Recommendations — Anthropic SDK (server-side Route Handler)

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | ^0.52.x (latest) | Claude API access from Next.js Route Handler |

**Decision: Add `@anthropic-ai/sdk`. Use `claude-3-haiku-20240307` (fast, cheap) for the weather widget. Use `claude-sonnet-4-5-20250929` if response quality matters more than latency.**

**Pattern: Next.js Route Handler (server-side only). Never call Claude API from client — API key must stay server-side.**

```typescript
// app/api/saasuositus/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  const { temperature, weatherCode, lajit } = await request.json()

  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 200,
    system: `Olet liikuntaneuvoja. Anna lyhyt, innostava suositus (max 2 lausetta) mikä liikuntamuoto sopii tähän säähän Tampereella. Mainitse yksi tai kaksi lajia listalta.`,
    messages: [{
      role: 'user',
      content: `Lämpötila: ${temperature}°C, säätila: ${weatherCode}, saatavilla olevat lajit: ${lajit.join(', ')}`,
    }],
  })

  const suositus = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ suositus })
}
```

**Open-Meteo stays.** It's free, no API key, accurate for Finnish coordinates. The client-side fetch in `Etusivu.tsx` remains. Only addition: results are forwarded to the Claude route handler for AI commentary.

**Environment variable to add:**
```
ANTHROPIC_API_KEY=sk-ant-...   # server-only, no NEXT_PUBLIC_ prefix
```

**Do NOT use:**
- OpenAI API — Claude is already available in this project's AI environment; no reason to add a second AI vendor.
- Streaming for the weather widget — the response is short (2 sentences); streaming adds complexity without UX benefit.

**Confidence:** HIGH — verified against Anthropic TypeScript SDK docs via Context7. Model names confirmed from SDK examples.

---

### Venue Data Enrichment — Supplemental Finnish APIs

Google Places covers name, address, coordinates, phone, and website for Finnish venues. What it does NOT provide reliably:

1. **Aukioloajat (opening hours):** Google Places `opening_hours` field exists but requires `opening_hours` in the `fields` parameter of Place Details requests. **Action:** Extend the existing `app/api/hae-paikat/route.ts` to include `opening_hours` in the Place Details `fields` array. Data goes into a new `aukioloajat jsonb` column in Supabase.

2. **Kertakäyntihinta (drop-in price):** Google Places has no pricing data for Finnish sports venues. **Action:** Manual data entry by the operator via a simple admin form backed by Supabase (`hinta_min`, `hinta_max` columns already exist in schema). No additional API.

3. **Finnish-specific venue registries:**
   - **LIPAS (liikuntapaikkarekisteri):** Finland's national sports facility registry, maintained by the Ministry of Education and Culture. REST API is public and free: `https://www.lipas.fi/api`. Provides facility type classification, surface type, and capacity for Finnish sports venues — data Google Places does not have. Useful for accurate `laji` categorization and supplementary metadata. **Confidence: MEDIUM** — API exists per training knowledge; verify current endpoint availability before implementation.
   - **City of Tampere Open Data:** Tampere publishes municipal sports facility data at `https://data.tampere.fi`. Useful for publicly-owned venues (uimahalli, jäähalli, liikuntahalli). **Confidence: MEDIUM** — open data portal confirmed to exist; specific endpoint availability needs verification during implementation phase.

4. **No additional paid venue API is recommended for v1.** The combination of Google Places + LIPAS + manual entry covers all data fields needed. Adding a paid venue data broker (e.g., Foursquare) would duplicate Google Places data without Finnish-specific benefit.

**Confidence for Finnish APIs:** MEDIUM — verified existence from training data; official endpoint stability needs real-time confirmation.

---

### PWA / Offline Capability

| Package | Version | Purpose |
|---------|---------|---------|
| `@ducanh2912/next-pwa` | ^10.x | Service worker, offline shell, installability |

**Decision: Add PWA support in a later milestone, not v1. Defer.**

**Rationale:** v1 requirements are focused on GPS location, pricing/hours data, and the AI widget. PWA adds ~1 day of setup work (manifest, service worker config, icon generation) and testing complexity. The venue data changes frequently enough that aggressive caching would cause staleness issues.

**When to add:** Once the core feature set is stable. Configuration for Next.js 14 App Router uses `next.config.mjs` (ES module, matches existing `next.config.mjs` in project):

```javascript
// next.config.mjs (when ready)
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontendNav: true,
})

export default withPWA({ /* existing next config */ })
```

**Do NOT use:**
- `next-pwa` (shadowwalker) — unmaintained since 2022, known conflicts with Next.js 13+.
- Manual service worker — too much maintenance burden for a solo project.

**Confidence:** HIGH — `@ducanh2912/next-pwa` verified via Context7 as the correct maintained fork for Next.js 14 App Router.

---

### Client-Side Data Fetching — No Library Needed Yet

Current pattern (server-side fetch in RSC, passed as props) is correct for v1. Do not add SWR or TanStack Query until there is a clear need (real-time updates, infinite scroll, or optimistic mutations). Adding it prematurely increases bundle size and cognitive overhead.

**If client-side fetching becomes necessary** (e.g., "nearby venues" triggered after GPS permission granted):
- Use `useSWR` from `swr` — lighter than TanStack Query, integrates cleanly with Next.js App Router, maintained by Vercel.
- Do NOT use TanStack Query for this project — it is more appropriate for complex data-fetching graphs than a simple venue directory.

---

### Supabase Client — Upgrade Pattern for Route Handlers

The existing `lib/supabase.ts` (single shared `createClient` instance with `NEXT_PUBLIC_` anon key) is fine for read-only public data.

For the new AI Route Handler (`/api/saasuositus`), no Supabase access is needed — it only calls Claude.

For any future server-side Supabase access requiring proper SSR cookie handling, use `@supabase/ssr`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
```

No migration of existing client needed for v1 — current pattern works for anonymous reads.

---

## New Environment Variables Required

| Variable | Side | Purpose |
|----------|------|---------|
| `ANTHROPIC_API_KEY` | server only | Claude API for weather recommendation widget |

Existing variables remain unchanged.

---

## Alternatives Considered and Rejected

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Maps wrapper | `@vis.gl/react-google-maps` | `@react-google-maps/api` (current) | Maintenance mode; deprecated `Marker`; no `AdvancedMarker` |
| Maps tiles | Google Maps (keep) | Mapbox GL JS | Adds paid tile costs; abandons existing API investment |
| Maps tiles | Google Maps (keep) | Leaflet | Poor mobile gesture UX; no clustering for 100+ markers |
| AI API | Anthropic Claude | OpenAI GPT | Second vendor with no benefit; Claude already available |
| Geolocation | Browser native API | react-use / navigator wrappers | Wrapper adds bundle weight for zero capability gain |
| PWA | `@ducanh2912/next-pwa` (deferred) | shadowwalker/next-pwa | Unmaintained, breaks Next.js 13+ |
| Database spatial | PostGIS (Supabase built-in) | External geospatial service | PostGIS is included in Supabase; no extra cost or service |

---

## Installation (When Implementing)

```bash
# Replace map library
npm uninstall @react-google-maps/api
npm install @vis.gl/react-google-maps

# Add Claude AI SDK
npm install @anthropic-ai/sdk

# PWA (defer to later milestone)
# npm install @ducanh2912/next-pwa
```

---

## Sources

- `@vis.gl/react-google-maps` migration guide: https://visgl.github.io/react-google-maps/docs/guides/migrating-from-react-wrapper (Context7 HIGH)
- `@vis.gl/react-google-maps` AdvancedMarker API: https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker (Context7 HIGH)
- Anthropic TypeScript SDK README: https://github.com/anthropics/anthropic-sdk-typescript (Context7 HIGH)
- Supabase PostGIS guide: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/extensions/postgis.mdx (Context7 HIGH)
- `@ducanh2912/next-pwa` configuring guide: https://github.com/ducanhgh/next-pwa/blob/master/docs/content/next-pwa/configuring.mdx (Context7 HIGH)
- Supabase SSR client for Next.js: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/server-side/creating-a-client.mdx (Context7 HIGH)
- LIPAS API: https://www.lipas.fi/api (MEDIUM — training knowledge, verify before use)
- Tampere Open Data: https://data.tampere.fi (MEDIUM — training knowledge, verify before use)
- Web Geolocation API: MDN Web Docs (HIGH — stable web standard)
