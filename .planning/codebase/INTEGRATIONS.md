# External Integrations

**Analysis Date:** 2026-05-19

## APIs & External Services

### Google Maps JavaScript API

- **Purpose:** Renders interactive maps with custom markers and InfoWindows inside the app UI
- **SDK/Client:** `@react-google-maps/api` 2.20.8 — React wrapper around the Google Maps JS SDK
- **Auth:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client-side; HTTP referrer restrictions are safe here)
- **Used in:**
  - `app/components/Kartta.tsx` — standalone map view with marker + InfoWindow per place
  - `app/components/Etusivu.tsx` — scroll-driven map expansion (peek → full screen); uses `useJsApiLoader`, `GoogleMap`, `Marker`
- **Initialization pattern:**
  ```tsx
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })
  ```
- **Map options used:** Custom `styles` array (POI hidden, muted palette in Etusivu), `streetViewControl: false`, `gestureHandling: 'greedy'`

### Google Places API (server-side only)

- **Purpose:** Fetches sports venues in Tampere via Text Search and Place Details; results are stored in Supabase
- **SDK/Client:** Native `fetch` (no SDK — raw REST calls to `maps.googleapis.com`)
- **Auth:** `GOOGLE_PLACES_API_KEY` — server-only env var (no `NEXT_PUBLIC_` prefix); safe because server calls carry no `Referer` header
- **Used in:** `app/api/hae-paikat/route.ts` (GET handler)
- **Endpoints called:**
  - `https://maps.googleapis.com/maps/api/place/textsearch/json` — searches "liikuntapaikat Tampere" within 15km radius
  - `https://maps.googleapis.com/maps/api/place/details/json` — fetches `website` and `formatted_phone_number` for each result; called in parallel via `Promise.all`
- **Data fields extracted:** `place_id`, `name`, `formatted_address`, `geometry.location`, `types`, `website`, `formatted_phone_number`
- **Tampere coordinates hardcoded:** `lat: 61.4978, lng: 23.761`, radius 15 000 m

### Open-Meteo Weather API

- **Purpose:** Fetches current temperature and weather code for Tampere to display in the AI widget on the home screen
- **SDK/Client:** Native browser `fetch` (client-side, no auth required)
- **Auth:** None — Open-Meteo is a free, no-key API
- **Used in:** `app/components/Etusivu.tsx` (inside `useEffect`)
- **Endpoint:**
  ```
  https://api.open-meteo.com/v1/forecast?latitude=61.4978&longitude=23.7610&current=temperature_2m,weather_code
  ```
- **Data used:** `current.temperature_2m` (rounded to integer), `current.weather_code` (mapped to emoji + exercise suggestion via `parseSaa()`)

## Data Storage

### Supabase (PostgreSQL)

- **Purpose:** Primary database — stores all sports venue records fetched from Google Places
- **Client package:** `@supabase/supabase-js` 2.105.4
- **Client setup:** `lib/supabase.ts` — single shared `createClient` instance exported as `supabase`
  ```ts
  import { createClient } from '@supabase/supabase-js'
  export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  ```
- **Auth env vars:**
  - `NEXT_PUBLIC_SUPABASE_URL` — project URL (client + server)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key (client + server)
- **Both vars are public** — suitable for anon read access; row-level security (RLS) should be configured in Supabase dashboard

**Table: `liikuntapaikat`**

Inferred schema from query and upsert operations across `app/page.tsx`, `app/paikat/[id]/page.tsx`, and `app/api/hae-paikat/route.ts`:

| Column | Type | Source |
|--------|------|--------|
| `id` | integer (PK, auto) | Supabase auto |
| `place_id` | text (unique) | Google Places `place_id` |
| `nimi` | text | Google Places `name` |
| `laji` | text | Derived via `detectLaji()` from `types[]` |
| `osoite` | text \| null | Parsed from `formatted_address` |
| `kaupunki` | text | Hardcoded `'Tampere'` |
| `latitude` | float \| null | `geometry.location.lat` |
| `longitude` | float \| null | `geometry.location.lng` |
| `varauslinkki` | text \| null | Google Places `website` |
| `puhelin` | text \| null | Google Places `formatted_phone_number` |
| `hinta_min` | numeric \| null | Not populated by API route (manual or future) |
| `hinta_max` | numeric \| null | Not populated by API route (manual or future) |
| `kuvaus` | text \| null | Not populated by API route (manual or future) |

- **Upsert conflict key:** `place_id` — deduplicates on repeated API calls
- **Read operations:** `app/page.tsx` selects all rows ordered by `nimi`; `app/paikat/[id]/page.tsx` selects `*` by `id`

**File Storage:** Not used — no Supabase Storage or S3/R2 integration detected.

**Caching:** None — data is fetched fresh on each server render; no Redis or in-memory cache.

## Authentication & Identity

**No user authentication.** The app is entirely public-read. No login, sessions, or Supabase Auth integration is present. The Supabase anon key is used for all DB access.

The `/suosikit` (favourites) page at `app/suosikit/page.tsx` is a stub with "coming soon" messaging — no favourites persistence is implemented.

## Monitoring & Observability

**Error Tracking:** None — no Sentry, Datadog, or similar service configured.

**Logging:** `console.error` / `console.log` only (Next.js default server logs). API route errors return structured JSON responses with HTTP status codes.

**Analytics:** None detected.

## CI/CD & Deployment

**Hosting:** No deployment config committed (no `vercel.json`, `Dockerfile`, or platform-specific files). Vercel is the natural target for Next.js 14 App Router with zero-config deployment.

**CI Pipeline:** None configured (no GitHub Actions workflows, CircleCI, or similar).

## Environment Configuration

**Required environment variables:**

| Variable | Side | Required | Purpose |
|----------|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Yes | Supabase anon key for DB reads/writes |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | client only | Yes | Google Maps JS API for map rendering |
| `GOOGLE_PLACES_API_KEY` | server only | Yes | Google Places REST API for venue import |

**Secrets location:** `.env.local` (gitignored, not committed). No `.env.example` file found.

**Note:** All four vars are required for full functionality. Missing `GOOGLE_PLACES_API_KEY` causes the `/api/hae-paikat` route to return HTTP 500. Missing map key causes maps to load in development mode with a watermark.

## Webhooks & Callbacks

**Incoming webhooks:** None.

**Outgoing webhooks:** None.

## Internal API Routes

**`GET /api/hae-paikat`** (`app/api/hae-paikat/route.ts`):
- Trigger: Manual HTTP GET (no UI button — intended to be called during data seeding)
- Flow: Google Places Text Search → Place Details (parallel) → Supabase upsert
- Returns JSON: `{ loydetty, tallennettu, website_loydetty }` on success
- Error states: 500 (missing API key), 502 (Google unreachable or HTTP error), 403 (API key rejected)

---

*Integration audit: 2026-05-19*
