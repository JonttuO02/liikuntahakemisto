# Architecture Patterns: v1.1 Feature Integration

**Project:** Liikuntahakemisto v1.1  
**Base:** Next.js 14 App Router + Supabase + @vis.gl/react-google-maps  
**Researched:** 2026-05-21  
**Confidence:** HIGH (verified against official Supabase docs, @vis.gl docs, Next.js docs)

---

## Existing Architecture Snapshot

The v1.0 codebase has a clear server/client split:

- `app/page.tsx` — async Server Component, fetches `liikuntapaikat` with anon key, passes data down as props
- `app/components/Etusivu.tsx` — large `'use client'` component, owns all map + AI widget state
- `app/components/LiikuntapaikatLista.tsx` — `'use client'`, owns list/filter state
- `lib/supabase.ts` — exports `supabase` (anon, client+server) and `supabaseAdmin` (service role, server-only)
- `app/components/MapProvider.tsx` — thin `'use client'` wrapper for `APIProvider`, in `layout.tsx`
- `hooks/useGPS.ts` — `'use client'` hook, auto-requests on mount, returns `{ status, coords, requestLocation }`
- `lib/sportPins.ts` — generates SVG data-URLs for map pins (existing `Marker`, not `AdvancedMarker`)

**Critical constraint:** the current map uses the legacy `Marker` component (deprecated as of Google Maps API v3.56). All v1.1 map features (clustering, accuracy ring, "Näytä kartalla" focus) require migrating to `AdvancedMarker`. This migration is a prerequisite for MAP-04, MAP-05, MAP-06, MAP-07.

---

## Feature 1: Supabase Auth (AUTH-01, AUTH-02, AUTH-03)

**Pattern:** `@supabase/ssr` middleware + server-side session, client-side `onAuthStateChange`.

### Package change

```bash
npm install @supabase/ssr
```

`@supabase/ssr` replaces the deprecated `@supabase/auth-helpers-nextjs`. The existing `@supabase/supabase-js` (already installed) stays — `@supabase/ssr` wraps it with cookie-aware clients for the App Router's three environments: browser, Server Component, and middleware.

### New files

| File | Type | Purpose |
|------|------|---------|
| `lib/supabase-server.ts` | Server util | `createServerClient` for Server Components and Route Handlers |
| `lib/supabase-middleware.ts` | Middleware util | `createServerClient` configured for middleware cookie write |
| `middleware.ts` (project root) | Next.js middleware | Session refresh on every request before Server Components run |
| `app/auth/callback/route.ts` | Route Handler | OAuth PKCE code exchange, redirects to `/` after |
| `app/auth/login/page.tsx` | Server Component | Login page shell (thin, renders AuthModal) |
| `app/components/AuthModal.tsx` | Client Component | Email + Google OAuth sign-in UI, calls `signInWithOAuth` |
| `app/components/AuthProvider.tsx` | Client Component | React context providing `{ user, supabase }` to all client components |
| `hooks/useAuth.ts` | Client hook | Reads `{ user, supabase }` from AuthProvider context |

### Middleware pattern (HIGH confidence — official Supabase docs)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  // MUST call getUser() — this is what actually refreshes the session token
  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Why middleware is required:** Server Components can read cookies but cannot write them. The middleware is the only place in the request lifecycle where the auth token can be refreshed and the updated cookie written to the response before it reaches the browser or any Server Component.

### Server Component client

```typescript
// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          // Errors here are safe to ignore when middleware is running
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

Always use `supabase.auth.getUser()` (not `getSession()`) in Server Components — `getUser()` validates the JWT signature cryptographically against Supabase's published public keys; `getSession()` only reads the cookie without validation.

### Client Component auth (AuthProvider)

```typescript
// app/components/AuthProvider.tsx
'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

// Create ONCE at module level — never inside a component render
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const AuthContext = createContext<{ user: User | null; supabase: typeof supabase }>({
  user: null, supabase,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      router.refresh()  // triggers Server Components to re-fetch with new session
    })
    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, supabase }}>{children}</AuthContext.Provider>
}
```

**Important:** Do NOT create multiple `createBrowserClient` instances across different components. A single instance at module scope is correct. Multiple instances open duplicate realtime connections.

Add `<AuthProvider>` to `app/layout.tsx` wrapping `<main>`.

### OAuth callback route

```typescript
// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = createSupabaseServer()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(origin)
}
```

**Google Cloud Console:** Add `https://yourdomain.com/auth/callback` to Authorized Redirect URIs.  
**Supabase Dashboard:** Auth → URL Configuration → add the same callback URL to Redirect URLs.

### Impact on existing `lib/supabase.ts`

The existing `supabase` export (anon browser client) continues to work for read-only public data in Server Components — it is used in `app/page.tsx` for listing venues and does not need auth context. It does NOT refresh session cookies; that is the middleware's job.

For auth-gated pages (suosikit), replace the anon client with `createSupabaseServer()` from `lib/supabase-server.ts`.

---

## Feature 2: Favorites Table (AUTH-02)

### Schema migration

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_suosikit.sql

CREATE TABLE suosikit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id   integer NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, paikka_id)  -- prevent duplicate favorites
);

ALTER TABLE suosikit ENABLE ROW LEVEL SECURITY;

-- Index on user_id — every favorites query filters by this column
CREATE INDEX suosikit_user_id_idx ON suosikit(user_id);

-- RLS: users see and manage only their own favorites
-- (SELECT auth.uid()) caches the call per statement for performance
CREATE POLICY "suosikit_select" ON suosikit
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "suosikit_insert" ON suosikit
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "suosikit_delete" ON suosikit
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
-- No UPDATE policy needed — favorites are insert/delete only (toggle)
```

**Design notes:**
- `(SELECT auth.uid())` wrapping — Postgres optimizer caches this per statement, not per row. This matters at scale.
- Both FK columns have `ON DELETE CASCADE` — deleting a user or a venue cleans up favorites automatically.
- No UPDATE policy — the toggle pattern (add/remove) does not need UPDATE.
- Anon users cannot access this table — policies are `TO authenticated` only, so unauthenticated attempts silently return no rows.

### Data flow

```
hooks/useSuosikit.ts (client)
  → useAuth() → gets supabase client + user
  → supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)
  → local Set<number> of favorited paikka_ids
  → toggle(id): optimistic update → insert or delete → rollback on error
```

Favorites are NOT fetched server-side on the public listing page. They are user-specific client state, loaded after hydration and auth check. This avoids blocking the SSR render for anonymous users (the majority).

### Modified files
- `app/suosikit/page.tsx` — replace placeholder with auth-gated page; fetch `suosikit` joined with `liikuntapaikat`
- `app/components/PaikkaKortti.tsx` — add heart toggle button (visible only when `user !== null`)
- `hooks/useSuosikit.ts` — new hook: fetch user's favorites, optimistic toggle

---

## Feature 3: Map Clustering (MAP-06)

**Package:** `@googlemaps/markerclusterer` is already in `package.json` (v2.6.2). No new installs needed.

**Prerequisite:** Migrate fullscreen map's `Marker` to `AdvancedMarker`. The `@googlemaps/markerclusterer` v2 expects `AdvancedMarkerElement` objects; passing legacy `Marker` elements causes silent failures.

### Clustering pattern (HIGH confidence — visgl official example + Discussion #325)

The clusterer is created imperatively (not declaratively) because `MarkerClusterer` does not have a React wrapper — it is a vanilla JS class. The React integration uses `useRef` + `useEffect` to manage its lifecycle, and a `setMarkerRef` callback to register/unregister each `AdvancedMarker` as it mounts/unmounts.

```typescript
// Extract into app/components/ClusteredMarkers.tsx (new)
'use client'
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { useEffect, useRef, useState, useCallback } from 'react'

export function ClusteredMarkers({ paikat, onSelect }: {
  paikat: Array<Liikuntapaikka & { latitude: number; longitude: number }>
  onSelect: (p: Liikuntapaikka) => void
}) {
  const map = useMap()
  const [markers, setMarkers] = useState<Record<number, google.maps.marker.AdvancedMarkerElement>>({})
  const clustererRef = useRef<MarkerClusterer | null>(null)

  useEffect(() => {
    if (!map) return
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map })
    }
  }, [map])

  useEffect(() => {
    clustererRef.current?.clearMarkers()
    clustererRef.current?.addMarkers(Object.values(markers))
  }, [markers])

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, id: number) => {
      setMarkers(prev => {
        if (marker && prev[id] === marker) return prev
        if (!marker && !prev[id]) return prev
        const next = { ...prev }
        if (marker) next[id] = marker
        else delete next[id]
        return next
      })
    },
    []
  )

  return (
    <>
      {paikat.map(p => {
        const color = (lajiKonfig as Record<string, { color: string }>)[p.laji]?.color ?? '#6b7280'
        return (
          <AdvancedMarker
            key={p.id}
            position={{ lat: p.latitude, lng: p.longitude }}
            ref={marker => setMarkerRef(marker, p.id)}
            onClick={() => onSelect(p)}
          >
            <div dangerouslySetInnerHTML={{ __html: pinSvgString(color, p.laji) }} />
          </AdvancedMarker>
        )
      })}
    </>
  )
}
```

`pinSvgString()` is a new variant of the existing `pinUrl()` in `lib/sportPins.ts` that returns raw SVG markup instead of a data URL, since `AdvancedMarker` accepts DOM children rather than `icon` URLs.

### Zoom-dependent info cards

Listen to `onCameraChanged` on the `<Map>` component to track current zoom. At `zoom >= 15`, render a small info card as children of the `AdvancedMarker` instead of just the pin. MarkerClusterer automatically disbands clusters at high zoom; individual markers appear and can show richer content.

```typescript
// In Etusivu.tsx:
const [zoom, setZoom] = useState(14)
// On Map: onCameraChanged={(ev) => setZoom(ev.detail.zoom)}

// In ClusteredMarkers AdvancedMarker children:
{zoom >= 15 ? <VenueInfoCard paikka={p} /> : <PinSvg color={color} laji={p.laji} />}
```

`VenueInfoCard` is a small, self-contained card: venue name, sport badge, price. Tapping it opens the bottom sheet (calls `onSelect`).

### Modified files
- `app/components/Etusivu.tsx` — remove fullscreen map's `Marker` imports, add `ClusteredMarkers`, add zoom state, add `onCameraChanged`
- `app/components/ClusteredMarkers.tsx` — new component
- `lib/sportPins.ts` — add `pinSvgString()` returning raw SVG (alongside existing `pinUrl()`)

---

## Feature 4: Re-center Button (MAP-04)

`useMap()` returns the raw `google.maps.Map` instance. Call `map.panTo()` from a button inside the `<Map>` element tree. The existing `MapPanController` already uses this exact pattern — the re-center button is a minor addition to the same approach.

```typescript
// app/components/MapReCenterButton.tsx (new, extracted)
'use client'
import { useMap } from '@vis.gl/react-google-maps'
import { Crosshair } from 'lucide-react'

export function MapReCenterButton({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap()
  if (!coords) return null
  return (
    <button
      onClick={() => { map?.panTo(coords); map?.setZoom(15) }}
      className="absolute bottom-20 right-4 z-10 w-10 h-10 glass-btn rounded-full flex items-center justify-center"
      aria-label="Palaa omaan sijaintiisi"
    >
      <Crosshair className="w-4 h-4" />
    </button>
  )
}
```

Place `<MapReCenterButton coords={coords} />` inside the fullscreen `<Map>` element in `Etusivu.tsx`. It must be inside `<Map>` (or at least inside `<APIProvider>`) for `useMap()` to find the map instance.

### Modified files
- `app/components/Etusivu.tsx` — add `<MapReCenterButton>` inside fullscreen map
- `app/components/MapReCenterButton.tsx` — new component

---

## Feature 5: GPS Accuracy Ring (MAP-05)

**Problem:** The current `userLocationPinUrl()` in `sportPins.ts` renders a baked SVG data-URL passed to a legacy `Marker`. A static SVG cannot scale with zoom level — the accuracy ring must grow/shrink as the user zooms in and out.

**Solution:** Migrate the user location marker to `AdvancedMarker` with an HTML `div` child. The accuracy ring is an absolutely-positioned circle whose pixel radius is calculated from `GeolocationCoordinates.accuracy` (meters) mapped to screen pixels at the current zoom level.

```typescript
// app/components/UserLocationMarker.tsx (new)
'use client'
import { AdvancedMarker } from '@vis.gl/react-google-maps'

// Convert accuracy in meters to screen pixels at a given zoom + latitude
function metersToPixels(meters: number, lat: number, zoom: number): number {
  const earthCircumference = 40075016
  const metersPerPx = (earthCircumference * Math.cos((lat * Math.PI) / 180)) /
    (256 * Math.pow(2, zoom))
  return meters / metersPerPx
}

export function UserLocationMarker({
  coords,
  accuracy,
  zoom,
}: {
  coords: { lat: number; lng: number }
  accuracy: number  // meters
  zoom: number      // current map zoom level
}) {
  const ringPx = metersToPixels(accuracy, coords.lat, zoom)

  return (
    <AdvancedMarker position={coords} zIndex={20} clickable={false}>
      <div style={{ position: 'relative', width: 0, height: 0 }}>
        {/* Accuracy ring — scales with zoom */}
        <div style={{
          position: 'absolute',
          width: ringPx * 2, height: ringPx * 2,
          left: -ringPx, top: -ringPx,
          borderRadius: '50%',
          background: 'rgba(66,133,244,0.12)',
          border: '1.5px solid rgba(66,133,244,0.35)',
          pointerEvents: 'none',
          transition: 'width 0.2s, height 0.2s, left 0.2s, top 0.2s',
        }} />
        {/* Blue dot */}
        <div style={{
          position: 'absolute', width: 18, height: 18,
          left: -9, top: -9, borderRadius: '50%',
          background: '#4285F4', border: '2.5px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }} />
      </div>
    </AdvancedMarker>
  )
}
```

**`useGPS` change required:** The hook currently does not expose `accuracy`. Add it:

```typescript
// hooks/useGPS.ts additions
export interface GPSState {
  status: GPSStatus
  coords: { lat: number; lng: number } | null
  accuracy: number | null  // NEW — from GeolocationCoordinates.accuracy
  requestLocation: () => void
}
// In success callback:
setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
setAccuracy(pos.coords.accuracy)  // NEW state
```

### Modified files
- `hooks/useGPS.ts` — expose `accuracy: number | null`
- `app/components/UserLocationMarker.tsx` — new component
- `app/components/Etusivu.tsx` — replace `Marker` + `userLocationPinUrl()` with `<UserLocationMarker>`, pass `zoom` state (already being tracked for clustering)

---

## Feature 6: "Näytä kartalla" — Focus Venue on Map (MAP-07)

**URL design:** `/?nakyma=kartta&id=<paikka_id>` — consistent with existing `?nakyma=kartta` scheme. Integer IDs (not UUIDs) since `liikuntapaikat.id` is a serial integer.

### Data flow

```
/paikat/[id] profile page
  → <Link href={`/?nakyma=kartta&id=${paikka.id}`}>Näytä kartalla</Link>

app/page.tsx (Server Component)
  → reads searchParams.id
  → passes focusId={Number(searchParams.id)} to <Etusivu>

Etusivu.tsx
  → useEffect when kartaAuki + map ready:
      setKartaAuki(true)
      map.panTo({ lat: target.latitude, lng: target.longitude })
      map.setZoom(16)
      setValittu(target)  // opens bottom sheet
```

```typescript
// app/page.tsx — extend searchParams type
searchParams: { nakyma?: string; id?: string }

// Pass to Etusivu:
<Etusivu paikat={data} focusId={searchParams.id ? Number(searchParams.id) : undefined} />

// Etusivu.tsx — new prop + effect
const { focusId } = props  // number | undefined

useEffect(() => {
  if (!focusId || !kartaAuki) return
  const target = paikat.find(p => p.id === focusId)
  if (!target?.latitude || !target?.longitude) return
  map?.panTo({ lat: target.latitude, lng: target.longitude })
  map?.setZoom(16)
  setValittu(target)
}, [focusId, kartaAuki, map])

// Separate effect: open map when focusId is present on mount
useEffect(() => {
  if (focusId) setKartaAuki(true)
}, [focusId])
```

**Note on routing:** The profile-page link causes a full navigation to `/?nakyma=kartta&id=X`. The server re-renders `app/page.tsx` with the new searchParams — this is correct and intentional, as the server needs to pass `focusId` to `Etusivu`. Do not attempt `window.history.pushState` here; it would update the URL client-side without giving the Server Component access to the new param.

### Modified files
- `app/paikat/[id]/page.tsx` — change "Näytä kartalla" from external Google Maps link to `/?nakyma=kartta&id=${paikka.id}`
- `app/page.tsx` — add `id` to `searchParams` type, pass `focusId` prop to Etusivu
- `app/components/Etusivu.tsx` — accept `focusId?: number`, add two focus effects

---

## Feature 7: Kaupunki Field + City Filter (DATA-07, AI-04)

**Schema status:** `kaupunki` column already exists in `liikuntapaikat` (present in `page.tsx` SELECT and `lib/types.ts`). No migration needed.

### City filter in LiikuntapaikatLista

```typescript
// LiikuntapaikatLista.tsx additions
const kaupungit = useMemo(() =>
  ['Kaikki', ...Array.from(new Set(paikat.map(p => p.kaupunki).filter(Boolean))).sort()],
  [paikat]
)
const [aktiivKaupunki, setAktiivKaupunki] = useState('Kaikki')

// Add to suodatettu filter:
const matchesKaupunki = aktiivKaupunki === 'Kaikki' || p.kaupunki === aktiivKaupunki
```

Render as a dropdown `<select>` (UI-08 wants the laji filter as dropdown too; same pattern). A native `<select>` on mobile opens the OS picker — appropriate for city selection.

### AI widget city integration (AI-04)

The `/api/saasuositus` route hardcodes Tampere coordinates and "Tampere" in the Claude prompt. For multi-city, accept an optional `?kaupunki=Helsinki` query param.

```typescript
// api/saasuositus/route.ts additions
const KAUPUNKI_COORDS: Record<string, [number, number]> = {
  Tampere:  [61.4978, 23.7610],
  Helsinki: [60.1699, 24.9384],
  Turku:    [60.4518, 22.2666],
}

export async function GET(request: Request) {
  const kaupunki = new URL(request.url).searchParams.get('kaupunki') ?? 'Tampere'
  const [lat, lng] = KAUPUNKI_COORDS[kaupunki] ?? KAUPUNKI_COORDS['Tampere']
  // Use lat/lng for Open-Meteo fetch and kaupunki name in Claude prompt
}
```

The client (`Etusivu.tsx`) passes the active kaupunki filter:

```typescript
fetch(`/api/saasuositus?kaupunki=${encodeURIComponent(aktiivKaupunki)}`)
```

The sessionStorage cache key should include the city:

```typescript
const key = `saasuositus-${new Date().toISOString().slice(0, 10)}-${aktiivKaupunki}`
```

### Modified files
- `app/components/LiikuntapaikatLista.tsx` — add kaupunki filter state + dropdown UI
- `app/components/Etusivu.tsx` — pass active city to AI widget fetch, update sessionStorage key
- `app/api/saasuositus/route.ts` — accept `kaupunki` param, parameterize coords + Claude prompt

---

## Feature 8: PWA (PWA-01, PWA-02)

**Package:** Use `@serwist/next` — the actively maintained successor to both `next-pwa` (unmaintained) and `@ducanh2912/next-pwa` (deprecated in favor of serwist), created by the same author. HIGH confidence.

```bash
npm install @serwist/next serwist
```

### next.config.mjs

```javascript
import withSerwist from '@serwist/next'

const withPWA = withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

export default withPWA({})
```

### Service worker caching strategy (`app/sw.ts`)

```typescript
import { defaultCache } from '@serwist/next/worker'
import { installSerwist } from 'serwist'

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // Navigation (pages): NetworkFirst — fresh content wins, falls back offline
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
    },
    // Static assets (JS/CSS/fonts): CacheFirst — content-hashed filenames guarantee freshness
    {
      matcher: ({ request }) => ['style', 'script', 'font'].includes(request.destination),
      handler: 'CacheFirst',
      options: { cacheName: 'static-assets', expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } },
    },
    // Supabase API: NetworkFirst — stale venue data is acceptable offline
    {
      matcher: ({ url }) => url.hostname.endsWith('.supabase.co'),
      handler: 'NetworkFirst',
      options: { cacheName: 'supabase', networkTimeoutSeconds: 5 },
    },
    // Open-Meteo weather: StaleWhileRevalidate — slightly stale weather is fine
    {
      matcher: ({ url }) => url.hostname === 'api.open-meteo.com',
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'weather', expiration: { maxEntries: 5, maxAgeSeconds: 1800 } },
    },
    // Google Maps tiles: CacheFirst — tiles rarely change
    {
      matcher: ({ url }) => url.hostname.includes('maps.googleapis.com') ||
                             url.hostname.includes('maps.gstatic.com'),
      handler: 'CacheFirst',
      options: { cacheName: 'maps', expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 } },
    },
  ],
})
```

**Do NOT cache:** `/api/saasuositus` (Claude API — costs money, personalized), `/api/admin/*` (admin routes).

### Web App Manifest

Next.js 14 App Router has built-in manifest support. Create `app/manifest.ts`:

```typescript
import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Liikuntahakemisto',
    short_name: 'ACTA',
    description: 'Löydä liikuntapaikat läheltäsi',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    icons: [
      { src: '/acta-symbol.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

SVG source (`acta-symbol.svg`, `acta-symbol-white.svg`) already exists in `app/`. PNG icons (192×192, 512×512) need to be generated from the SVG — a one-time asset task.

**Offline fallback:** Create `app/~offline/page.tsx` — rendered when user is offline and the requested page is not cached.

### Modified files
- `next.config.mjs` — wrap with `withSerwist`
- `app/manifest.ts` — new (Next.js built-in, replaces any manual `public/manifest.json`)
- `app/sw.ts` — new service worker entry point
- `app/~offline/page.tsx` — new offline fallback page
- `public/icon-192.png`, `public/icon-512.png` — new generated assets

---

## Feature 9: GDPR Page (LEGAL-01)

Static Server Component, no data fetching, no client JS.

```
app/tietosuoja/page.tsx  — new page
```

**Required content:** what data is collected (GPS — browser-only, not sent to server; sessionStorage for AI cache; Supabase auth session cookie if user signs in), third parties (Google Maps JS API, Open-Meteo, Anthropic/Claude), no persistent tracking without auth, cookie policy (session cookie only, set by Supabase Auth), contact email, how to request data deletion.

Link from `NavBar.tsx` dropdown menu and from the auth sign-up UI.

### Modified files
- `app/tietosuoja/page.tsx` — new
- `app/components/NavBar.tsx` — add tietosuoja link in hamburger dropdown

---

## Feature 10: "Sponsoroitu" Badge (ADS-02)

`featured` boolean already exists in the schema (ADS-01), is already selected in `page.tsx`, and is already in `Liikuntapaikka` type. This is a pure UI addition.

**List view:** In `PaikkaKortti.tsx`, if `paikka.featured === true`, render a small "Sponsoroitu" pill — e.g., a star icon + text in a gold/amber color, placed in the card's name row.

**Map view:** In `Etusivu.tsx` (or `ClusteredMarkers.tsx`), featured venues get a gold star overlay on their map pin. Add a `featured` param to `pinSvgString()` in `sportPins.ts`:

```typescript
// lib/sportPins.ts
export function pinSvgString(color: string, laji: string, featured = false): string {
  const starOverlay = featured
    ? `<text x="22" y="6" font-size="10" fill="#FBBF24" font-family="sans-serif">★</text>`
    : ''
  // ... rest of existing SVG template + starOverlay
}
```

No new data fetching, no schema changes.

### Modified files
- `app/components/PaikkaKortti.tsx` — add featured badge
- `lib/sportPins.ts` — add `featured` param to `pinSvgString()`
- `app/components/Etusivu.tsx` / `ClusteredMarkers.tsx` — pass `featured` to pin renderer

---

## Component Boundary Map

```
layout.tsx (Server)
  └── MapProvider (Client) — APIProvider wraps entire tree [unchanged]
      └── AuthProvider (Client) — NEW, provides { user, supabase } context
          └── NavBar (Client) — add tietosuoja link; auth-aware UI [modified]
          └── <main>
              └── page.tsx (Server, async) — fetches paikat, reads searchParams.nakyma + searchParams.id
                  └── Etusivu (Client) — receives paikat + focusId [modified]
                      ├── ClusteredMarkers (Client) — NEW, extracted from Etusivu
                      ├── UserLocationMarker (Client) — NEW
                      ├── MapReCenterButton (Client) — NEW
                      └── bottom sheet (inline in Etusivu) — unchanged
                  OR
                  └── LiikuntapaikatLista (Client) — add kaupunki filter [modified]
                      └── PaikkaKortti (Client) — add heart + sponsored badge [modified]

          └── app/suosikit/page.tsx (Server, auth-gated via createSupabaseServer)
              └── SuosikitLista (Client) — NEW
          └── app/auth/login/page.tsx (Server, thin shell)
              └── AuthModal (Client) — NEW
          └── app/tietosuoja/page.tsx (Server, static) — NEW
          └── app/auth/callback/route.ts (Route Handler) — NEW
          └── app/api/saasuositus/route.ts (Route Handler) — add kaupunki param [modified]

middleware.ts (runs before every request) — NEW, refreshes session token
```

---

## Schema Migrations Required

| File | Change | Dependency |
|------|--------|------------|
| `YYYYMMDDHHMMSS_add_suosikit.sql` | Create `suosikit` table, RLS policies, `user_id` index | AUTH-02 blocked until this runs |
| (none) | `kaupunki` column already exists | — |
| (none) | `featured` column already exists | — |

The `liikuntapaikat` table does NOT need schema changes for any v1.1 feature. Only the new `suosikit` table is required.

---

## Build Order (Risk-Minimizing)

Features are ordered by dependency and change risk.

### Group 1 — Pure UI, zero dependencies (build first)

1. **ADS-02** Sponsoroitu badge — `featured` in data already, pure CSS addition. ~30 min.
2. **LEGAL-01** GDPR page — static content, no deps. ~1 hour.
3. **DATA-07** Kaupunki filter — column exists, add dropdown in LiikuntapaikatLista. ~2 hours.
4. **AI-04** Kaupunki in AI widget — small route change + sessionStorage key update. ~1 hour.

### Group 2 — Map infrastructure (prerequisite for all other map features)

5. **Marker → AdvancedMarker migration** — Migrate fullscreen map's `Marker` to `AdvancedMarker`. Must be done before clustering, accuracy ring, and focus. Test carefully; it touches the core interaction. ~3-4 hours.
6. **MAP-04** Re-center button — trivial after AdvancedMarker migration (`useMap` + `panTo`). ~1 hour.

### Group 3 — Map features (after Group 2)

7. **MAP-05** GPS accuracy ring — requires AdvancedMarker + `accuracy` from `useGPS`. ~2-3 hours.
8. **MAP-07** "Näytä kartalla" URL focus — requires programmatic `setKartaAuki` + `panTo` + `setValittu`. ~2 hours.
9. **MAP-06** Clustering — highest-complexity map feature, build when map is otherwise stable. ~4-6 hours.

### Group 4 — Auth infrastructure (before favorites)

10. **AUTH-01** Supabase Auth — install `@supabase/ssr`, write middleware, AuthProvider, login page, OAuth callback. ~4-6 hours.
11. **AUTH-02** Suosikit — run migration, write RLS, `useSuosikit` hook, heart button in PaikkaKortti, suosikit page. Blocked on AUTH-01. ~4-5 hours.
12. **AUTH-03** Personalized AI — extend `/api/saasuositus` to accept user's favorite lajit and bias the Claude prompt. Blocked on AUTH-02. ~2 hours.

### Group 5 — PWA (build last, wraps stable feature set)

13. **PWA-02** Web App Manifest — `app/manifest.ts`, generate PNG icons. ~1 hour. Can move earlier if desired.
14. **PWA-01** Service worker — install serwist, configure caching, offline fallback. Best done last when all API routes and caching requirements are known. ~3-4 hours.

**Total:** approximately 30-35 hours of implementation.

---

## Anti-Patterns to Avoid

### 1. Multiple `createBrowserClient` instances
**What:** Creating a new Supabase browser client inside each component that needs auth.  
**Why bad:** Each instance opens a separate realtime WebSocket connection and registers a duplicate `onAuthStateChange` listener.  
**Instead:** Create once at module level in `AuthProvider.tsx`, export via React context.

### 2. `getSession()` for auth validation in Server Components
**What:** Using `supabase.auth.getSession()` to check whether a user is logged in server-side.  
**Why bad:** `getSession()` reads the session from the cookie without validating the JWT signature. A forged cookie would pass.  
**Instead:** Always use `supabase.auth.getUser()` in Server Components — it validates the JWT against Supabase's public keys on every call.

### 3. Clustering with legacy `Marker`
**What:** Adding legacy `Marker` instances to `MarkerClusterer`.  
**Why bad:** `@googlemaps/markerclusterer` v2 performs an `Object.is()` check expecting `AdvancedMarkerElement` objects. Legacy Markers silently fail.  
**Instead:** Migrate to `AdvancedMarker` before adding clustering (Group 2 in build order).

### 4. Blocking SSR on auth state
**What:** Calling `createSupabaseServer().auth.getUser()` in `app/page.tsx` before rendering the venue list.  
**Why bad:** Adds a network round-trip to every anonymous page load (the majority). The public listing requires no auth.  
**Instead:** Fetch `liikuntapaikat` anonymously (existing pattern). Auth-specific UI (heart buttons, personalized AI) loads client-side after hydration.

### 5. Caching `/api/saasuositus` in the service worker
**What:** Adding a SW caching rule for the AI route.  
**Why bad:** Claude API calls cost money, the response is time- and weather-sensitive, and a cached response from one user could be served to another.  
**Instead:** The existing `sessionStorage` cache per calendar day (AI-03) is the right caching layer. Do not add SW caching for this route.

### 6. Using `window.history.pushState` for the "Näytä kartalla" navigation
**What:** Setting `?nakyma=kartta&id=X` via pushState from the profile page.  
**Why bad:** `window.history.pushState` updates the browser URL client-side but does not trigger a server render. The Server Component (`app/page.tsx`) never sees the new `id` param and cannot pass `focusId` to Etusivu.  
**Instead:** Use `<Link href="/?nakyma=kartta&id=X">` — full navigation, server renders with correct `searchParams`.

### 7. Hardcoding accuracy ring size in the SVG data URL
**What:** Adding the accuracy ring as a fixed-size element in `userLocationPinUrl()`.  
**Why bad:** The ring must resize as the user zooms the map; a baked-in SVG cannot do this.  
**Instead:** Use `AdvancedMarker` with an HTML child whose dimensions are computed from `metersToPixels()` on every zoom change.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Supabase Auth (`@supabase/ssr`, middleware, callback) | HIGH | Official Supabase server-side Next.js guide |
| RLS policy design for suosikit | HIGH | Official Supabase RLS docs |
| `@googlemaps/markerclusterer` + `AdvancedMarker` | HIGH | visgl official example + Discussion #325 |
| `useMap` + `panTo` for re-center | HIGH | visgl Discussion #250, official API reference |
| `AdvancedMarker` HTML child for accuracy ring | HIGH | Google Maps Platform docs (AdvancedMarkerElement custom HTML) |
| `@serwist/next` for PWA | HIGH | Active maintenance confirmed; recommended over next-pwa and @ducanh2912/next-pwa |
| Service worker caching strategy (specific timeouts) | MEDIUM | Serwist docs + community; tune after production traffic observed |
| City-to-coords lookup for AI widget | HIGH | Static table, no external dep |
| "Näytä kartalla" URL param routing | HIGH | Standard Next.js App Router `searchParams` pattern |

---

## Sources

- [Setting up Server-Side Auth for Next.js — Supabase Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Creating a Supabase client for SSR — Supabase Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Row Level Security — Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Login with Google OAuth — Supabase Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Marker Clustering example — visgl React Google Maps](https://visgl.github.io/react-google-maps/examples/marker-clustering)
- [AdvancedMarker Component API — visgl](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker)
- [Using cluster with AdvancedMarker + InfoWindow — visgl Discussion #325](https://github.com/visgl/react-google-maps/discussions/325)
- [panTo with useMap — visgl Discussion #250](https://github.com/visgl/react-google-maps/discussions/250)
- [Building a PWA with Serwist — Medium](https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7)
- [PWA Guides — Next.js Docs](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [useSearchParams — Next.js Docs](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [AdvancedMarkerElement custom HTML — Google Maps Platform](https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers)
