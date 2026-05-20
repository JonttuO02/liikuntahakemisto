# External Integrations

**Analysis Date:** 2026-05-20

## APIs & External Services

### Google Maps JavaScript API

- **Purpose:** Renders interactive maps with custom sport pins and bottom-sheet popups
- **SDK/Client:** `@react-google-maps/api` 2.20.8 — React wrapper around the Google Maps JS SDK
- **Auth:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client-side; HTTP referrer restrictions are safe here)
- **Used in:** `app/components/Kartta.tsx` — full map view with animated `OverlayView` sport pins and glass bottom sheet
- **Initialization pattern:**
  ```tsx
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })
  ```
- **Map themes:** Custom day/night styles defined in `lib/mapStyles.ts` — Aubergine night style, muted day style. Auto-switches on hour boundary via 60s `setInterval`.
- **Map options:** `streetViewControl: false`, `mapTypeControl: false`, `fullscreenControl: false`, `zoomControl: true`

### Google Places API (server-side only)

- **Purpose:** Fetches sports venues in Tampere via Text Search and Place Details; results are stored in Supabase
- **SDK/Client:** Native `fetch` (no SDK — raw REST calls to `maps.googleapis.com`)
- **Auth:** `GOOGLE_PLACES_API_KEY` — server-only env var (no `NEXT_PUBLIC_` prefix); safe because server route calls carry no `Referer` header
- **Used in:**
  - `app/api/admin/sync-paikat/route.ts` — protected admin sync route (requires `Authorization: Bearer $ADMIN_SECRET`)
  - `app/api/hae-paikat/route.ts` — duplicate of the above (legacy; both routes implement identical logic)
- **Endpoints called:**
  - `https://maps.googleapis.com/maps/api/place/textsearch/json` — searches "liikuntapaikat Tampere" within 15km radius
  - `https://maps.googleapis.com/maps/api/place/details/json` — fetches `website` and `formatted_phone_number` for each result; called in parallel via `Promise.all`
- **Data fields extracted:** `place_id`, `name`, `formatted_address`, `geometry.location`, `types`, `website`, `formatted_phone_number`
- **Tampere coordinates hardcoded:** `lat: 61.4978, lng: 23.761`, radius 15 000 m

### Open-Meteo Weather API (planned — Phase 5)

- **Purpose:** Fetch current temperature and weather code for Tampere for the AI weather widget
- **SDK/Client:** Native `fetch` (no auth required — free, no-key API)
- **Auth:** None
- **Planned endpoint:**
  ```
  https://api.open-meteo.com/v1/forecast?latitude=61.4978&longitude=23.7610&current=temperature_2m,weather_code
  ```
- **Status:** Not yet implemented in the codebase; planned for Phase 5 alongside the Claude AI widget

### Claude AI API (planned — Phase 5)

- **Purpose:** Generate personalised sport recommendations based on user location, weather, and preferences
- **SDK/Client:** Anthropic SDK or direct REST — TBD
- **Auth:** `ANTHROPIC_API_KEY` (server-only env var) — not yet present in codebase
- **Planned route:** `/api/saasuositus` (Route Handler, non-blocking, never SSR)
- **Status:** Not yet implemented

## Data Storage

### Supabase (PostgreSQL)

- **Purpose:** Primary database — stores all sports venue records fetched from Google Places
- **Client package:** `@supabase/supabase-js` 2.105.4
- **Client setup:** `lib/supabase.ts` exports two clients:

  **Anon client (read-only after RLS):**
  ```ts
  export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  ```
  Used in: `app/page.tsx`, `app/paikat/[id]/page.tsx` — server-side data fetching for page renders.

  **Admin client (bypasses RLS — server-only):**
  ```ts
  export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  ```
  Used in: `app/api/admin/sync-paikat/route.ts`, `app/api/hae-paikat/route.ts` — write operations (upsert).
  NEVER import `supabaseAdmin` in client components — it holds the service role key.

- **Auth env vars:**
  - `NEXT_PUBLIC_SUPABASE_URL` — project URL (client + server)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key, read-only after RLS (client + server)
  - `SUPABASE_SERVICE_ROLE_KEY` — service role key for writes (server-only, no `NEXT_PUBLIC_` prefix)

- **RLS status:** Enabled (Phase 1 complete) — anon key can only read; writes require service role key

**Table: `liikuntapaikat`**

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
| `hinta_min` | numeric \| null | Manual / future |
| `hinta_max` | numeric \| null | Manual / future |
| `kuvaus` | text \| null | Manual / future |
| `hinta_kuvaus` | text \| null | Phase 1 addition (DATA-04) |
| `aukioloajat` | jsonb \| null | Phase 1 addition — `Record<string, {open, close}>` |
| `lajit_lista` | text[] \| null | Phase 1 addition — array of sport slugs |
| `featured` | boolean \| null | Phase 1 addition — promoted listing flag |

TypeScript type: `lib/types.ts` → `Liikuntapaikka`

- **Upsert conflict key:** `place_id` — deduplicates on repeated API sync calls
- **Read operations:** `app/page.tsx` selects named columns ordered by `nimi`; `app/paikat/[id]/page.tsx` selects `*` by `id`

**File Storage:** Not used.

**Caching:** None — data is fetched fresh on each server render; no Redis or in-memory cache.

## Authentication & Identity

**No user authentication.** The app is entirely public-read. No login, sessions, or Supabase Auth integration present.

**Admin route protection:** `app/api/admin/sync-paikat/route.ts` requires `Authorization: Bearer <ADMIN_SECRET>` header. `ADMIN_SECRET` is a server-only env var. Missing or mismatched header returns HTTP 401.

The `/suosikit` (favourites) page (`app/suosikit/page.tsx`) is a stub — no favourites persistence implemented.

## Monitoring & Observability

**Error Tracking:** None — no Sentry, Datadog, or similar service configured.

**Logging:** `console.error` / `console.log` only (Next.js default server logs). API route errors return structured JSON responses with HTTP status codes.

**Analytics:** None detected.

## CI/CD & Deployment

**Hosting:** No deployment config committed (no `vercel.json`, `Dockerfile`, or platform-specific files). Vercel is the natural target for Next.js 14 App Router.

**CI Pipeline:** None configured.

## Environment Configuration

**Required environment variables:**

| Variable | Side | Purpose |
|----------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key — read-only after RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Supabase service role key — bypasses RLS for writes |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | client only | Google Maps JS API for map rendering |
| `GOOGLE_PLACES_API_KEY` | server only | Google Places REST API for venue import/sync |
| `ADMIN_SECRET` | server only | Bearer token guarding `/api/admin/sync-paikat` |

**Secrets location:** `.env.local` (gitignored, not committed). No `.env.example` file present.

**Critical rules:**
- `SUPABASE_SERVICE_ROLE_KEY` must never have `NEXT_PUBLIC_` prefix — it would be exposed in the browser bundle
- `GOOGLE_PLACES_API_KEY` must never have `NEXT_PUBLIC_` prefix — it has no referrer restriction and would be abused
- `ADMIN_SECRET` must never have `NEXT_PUBLIC_` prefix

## Internal API Routes

**`GET /api/admin/sync-paikat`** (`app/api/admin/sync-paikat/route.ts`):
- Protected: requires `Authorization: Bearer <ADMIN_SECRET>` header
- Flow: Google Places Text Search → Place Details (parallel) → Supabase upsert via `supabaseAdmin`
- Returns JSON: `{ loydetty, tallennettu, website_loydetty }` on success
- Error states: 401 (bad auth), 500 (missing API key / server config), 502 (Google unreachable), 403 (API key rejected)

**`GET /api/hae-paikat`** (`app/api/hae-paikat/route.ts`):
- Identical logic to `sync-paikat` — also protected with `ADMIN_SECRET`
- Legacy route; may be consolidated with `sync-paikat` in a future phase

## Webhooks & Callbacks

**Incoming webhooks:** None.

**Outgoing webhooks:** None.

---

*Integration audit: 2026-05-20*
