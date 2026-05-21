# Technology Stack

**Project:** Liikuntahakemisto
**Researched:** 2026-05-21
**Scope of this update:** v1.1 additions ONLY. Existing stack (Next.js 14, @supabase/supabase-js ^2.105.4, @vis.gl/react-google-maps ^1.8.3, @googlemaps/markerclusterer ^2.6.2, Tailwind v3, Framer Motion, @anthropic-ai/sdk) is validated from v1.0 and unchanged.

---

## v1.0 Stack (Validated — Do Not Re-Research)

| Technology | Version | Status |
|------------|---------|--------|
| Next.js | 14.2.35 | Keep |
| React | 18.x | Keep |
| TypeScript | ^5 strict | Keep |
| Tailwind CSS | ^3.4.1 (v3) | Keep |
| Framer Motion | ^12.38.0 | Keep |
| @supabase/supabase-js | ^2.105.4 | Keep |
| @vis.gl/react-google-maps | ^1.8.3 | Keep |
| @googlemaps/markerclusterer | ^2.6.2 | Keep — already installed |
| @anthropic-ai/sdk | ^0.97.1 | Keep |
| @base-ui/react | ^1.4.1 | Keep |

---

## v1.1 Dependency Delta

### New Packages (install these)

```bash
npm install @supabase/ssr @serwist/next serwist
```

| Package | Version | Feature Group | Why |
|---------|---------|---------------|-----|
| `@supabase/ssr` | `^0.10.3` | Auth + Favorites | Cookie-based session management required for App Router auth |
| `@serwist/next` | `^9.0.0` | PWA | Next.js plugin that generates service worker with Workbox precaching |
| `serwist` | `^9.0.0` | PWA | Serwist runtime (peer dependency of @serwist/next) |

### No New Packages (already covered)

| Feature | Why No New Package |
|---------|-------------------|
| Map clustering | `@googlemaps/markerclusterer` ^2.6.2 already installed |
| GPS accuracy ring | `@vis.gl/react-google-maps` `<Circle>` component already available |
| City expansion | SQL schema migration + existing Supabase client |
| Google OAuth | Supabase Dashboard configuration, no npm package |
| Web App Manifest | Next.js App Router `app/manifest.ts` built-in convention |

---

## Feature 1: Supabase Auth (email + Google OAuth) + Favorites in DB

### Why `@supabase/ssr` Is Required

The existing `@supabase/supabase-js` shared client works for anonymous reads. Auth in Next.js App Router requires cookie-based session management — Server Components cannot write cookies, so sessions must be refreshed through middleware. `@supabase/ssr` provides `createServerClient` and `createBrowserClient` with this cookie plumbing built in.

**Confirmed current version:** 0.10.3, published May 2026 (active maintenance confirmed).
**Compatibility:** Works with existing `@supabase/supabase-js` >=2.0.0 — satisfied by current ^2.105.4.

**Do NOT use:** `@supabase/auth-helpers-nextjs` — deprecated, replaced by `@supabase/ssr`. Do NOT use `next-auth` — Supabase Auth handles Google OAuth natively without it.

### Three Files to Add (no extra packages)

**`lib/supabase/server.ts`** — for Server Components, Route Handlers, Server Actions:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

**`lib/supabase/client.ts`** — for Client Components:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`middleware.ts`** (project root) — refreshes expired tokens on every request:
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  // Always call getUser() — this refreshes the session token
  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Google OAuth Configuration (no npm package)

1. Supabase Dashboard → Authentication → Providers → Google: enter Google Client ID + Secret
2. Google Cloud Console → OAuth 2.0 Client → Authorized Redirect URIs: `https://<project>.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs: add production domain

### Supabase Schema for Favorites (SQL migration)

```sql
CREATE TABLE suosikit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paikka_id bigint REFERENCES paikat(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, paikka_id)
);

ALTER TABLE suosikit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON suosikit FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON suosikit FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON suosikit FOR DELETE USING (auth.uid() = user_id);
```

The service role key is NOT needed for favorites. The anon key + RLS is sufficient because authenticated users have `auth.uid()` in request context.

**Confidence: HIGH** — verified against Supabase SSR docs and official Next.js auth guide.

---

## Feature 2: Map Clustering + Zoom-Dependent Info Cards

### No New Package — `@googlemaps/markerclusterer` Already Installed

`@googlemaps/markerclusterer` ^2.6.2 is already in `package.json`. This is exactly what the official `@vis.gl/react-google-maps` marker-clustering example uses.

**Confidence: HIGH** — verified against vis.gl official examples at https://visgl.github.io/react-google-maps/examples/marker-clustering

### Architecture for Zoom-Dependent Behavior

The `@googlemaps/markerclusterer` handles cluster pins at lower zoom automatically. The zoom-dependent switch from clusters to individual info cards is a React state pattern, not a library feature:

```
zoom < 14 (approximate):  MarkerClusterer manages grouped cluster pins
zoom >= 14:               MarkerClusterer dissolves; render individual
                          AdvancedMarker components with info card overlay
```

Read the current zoom using `useMap()` from `@vis.gl/react-google-maps` and listen for `zoom_changed` events. Conditionally render based on the zoom value.

**Do NOT add:** `supercluster` or `use-supercluster` — redundant with the already-installed `@googlemaps/markerclusterer`. The custom clustering example at vis.gl uses supercluster for fully custom cluster rendering, but this project's requirement (standard cluster pins → info cards at high zoom) is well-covered by the existing package.

---

## Feature 3: GPS Accuracy Ring

### No New Package — `<Circle>` Component Already Available

`@vis.gl/react-google-maps` exports a `<Circle>` geometry component. No additional installation needed:

```tsx
import { Circle } from '@vis.gl/react-google-maps'

<Circle
  center={{ lat: userLat, lng: userLng }}
  radius={accuracy}          // meters, from GeolocationCoordinates.accuracy
  strokeColor="#4F46E5"      // indigo-600
  strokeOpacity={0.4}
  strokeWeight={1}
  fillColor="#4F46E5"
  fillOpacity={0.08}
/>
```

The `accuracy` value comes from `GeolocationCoordinates.accuracy` already captured by the existing `useGeolocation` hook.

**Confidence: HIGH** — verified against vis.gl geometry examples documentation.

---

## Feature 4: PWA (Service Worker + Offline Support + Web App Manifest)

### Recommended: `@serwist/next`

| Package | Version | Status |
|---------|---------|--------|
| `@serwist/next` | `^9.0.0` | INSTALL |
| `serwist` | `^9.0.0` | INSTALL (peer dep) |

**Confirmed current version:** `@serwist/next` 9.5.7, published ~May 2026 (active maintenance confirmed).

**Why Serwist over alternatives:**

| Option | Status | Verdict |
|--------|--------|---------|
| `shadowwalker/next-pwa` | Abandoned since mid-2024 | Do NOT use |
| `@ducanh2912/next-pwa` | Author migrated to Serwist; stale | Do NOT use |
| Manual `public/sw.js` | Official Next.js guide approach | Viable for manifest-only PWA; no asset precaching |
| `@serwist/next` | Actively maintained, Next.js 14+15 supported | USE THIS |

**Compatibility constraint:** `@serwist/next` requires webpack (not Turbopack). This is fine — Next.js 14 defaults to webpack. Do NOT use `next dev --turbo` when working on PWA features.

**The Web App Manifest does not need Serwist** — it uses Next.js App Router's built-in `app/manifest.ts` convention. Serwist is only needed for the service worker / offline caching.

### Configuration

**Install:**
```bash
npm install @serwist/next serwist
```

**`next.config.js`** — wrap existing config:
```js
const { withSerwistInit } = require('@serwist/next')

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development', // avoid stale cache in dev
})

module.exports = withSerwist({
  // existing next config options
})
```

**`app/sw.ts`** — service worker source file:
```ts
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

**`app/manifest.ts`** — Web App Manifest (zero extra packages, built into Next.js):
```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Liikuntahakemisto',
    short_name: 'Liikunta',
    description: 'Löydä liikuntapaikka läheltäsi',
    start_url: '/',
    display: 'standalone',
    background_color: '#EEF2FF',   // indigo-50
    theme_color: '#4F46E5',        // indigo-600
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

**Required image assets** (create, not installed):
- `public/icon-192x192.png`
- `public/icon-512x512.png`

Use https://realfavicongenerator.net to generate these from a source SVG.

### "Add to Home Screen" Prompt

Handled entirely in a Client Component — no library needed:
- Android/Chrome: listen for `beforeinstallprompt` event, capture and defer it, show a custom button
- iOS/Safari: detect via `navigator.userAgent` and show manual instructions (Safari does not support `beforeinstallprompt`)
- Check `window.matchMedia('(display-mode: standalone)')` to hide prompt when already installed

**Push notifications are OUT OF SCOPE for v1.1** (PWA-01, PWA-02 only require offline support + manifest). The `web-push` package and VAPID keys are not needed now.

**Confidence: HIGH** — verified against Next.js official PWA guide (last updated 2026-05-19) and Serwist npm (v9.5.7 active).

---

## Feature 5: City Expansion (Helsinki + Turku)

### No New Package

Schema migration + existing Supabase client + extended data sync script:

**SQL migration:**
```sql
ALTER TABLE paikat ADD COLUMN IF NOT EXISTS kaupunki text DEFAULT 'Tampere';
CREATE INDEX IF NOT EXISTS paikat_kaupunki_idx ON paikat(kaupunki);
```

Query by city with existing `@supabase/supabase-js`:
```ts
const { data } = await supabase
  .from('paikat')
  .select('*')
  .eq('kaupunki', selectedCity)
```

The existing `/api/admin/sync-paikat` script is extended with a `?city=Helsinki` parameter — no new API integration.

**Confidence: HIGH** — no external dependency, pure SQL + existing client.

---

## Complete Installation Summary

```bash
# v1.1 new packages only
npm install @supabase/ssr @serwist/next serwist

# No packages to remove
# No packages to upgrade (existing versions are current)
```

---

## What NOT to Add

| Library | Why Avoid |
|---------|-----------|
| `@supabase/auth-helpers-nextjs` | Deprecated — superseded by `@supabase/ssr` |
| `next-auth` | Redundant — Supabase Auth handles Google OAuth natively |
| `shadowwalker/next-pwa` | Abandoned mid-2024, breaks Next.js 13+ |
| `@ducanh2912/next-pwa` | Author deprecated in favour of Serwist; stale |
| `supercluster` | Redundant — `@googlemaps/markerclusterer` already installed |
| `use-supercluster` | Redundant — same reason |
| `react-google-maps/api` | Wrong library — project uses `@vis.gl/react-google-maps` |
| `@googlemaps/js-api-loader` | Redundant — `APIProvider` from `@vis.gl/react-google-maps` handles this |
| `workbox-*` packages | Not needed directly — Serwist wraps Workbox |
| `web-push` | Out of scope for v1.1 PWA (no push notifications needed) |
| `swr` / `@tanstack/react-query` | Premature — no client-side data fetching need identified for v1.1 |

---

## Environment Variables — v1.1 Additions

No new env vars required. Auth reuses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The service role key is NOT needed for the favorites feature (anon key + RLS is sufficient for authenticated reads/writes on the `suosikit` table).

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| `@supabase/ssr` setup | HIGH | Official Supabase SSR docs + npm (v0.10.3 confirmed) |
| `@serwist/next` setup | HIGH | Next.js official PWA guide + Serwist npm (v9.5.7 confirmed) |
| `@googlemaps/markerclusterer` clustering | HIGH | vis.gl official marker-clustering example |
| GPS accuracy `<Circle>` | HIGH | vis.gl geometry examples |
| Supabase RLS for favorites | HIGH | Official Supabase RLS docs |
| Google OAuth via Supabase | HIGH | Official Supabase auth-google docs |
| City expansion (SQL only) | HIGH | No new dependency; standard Supabase pattern |

---

## Sources

- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) — v0.10.3 confirmed current (May 2026)
- [Supabase SSR — Creating a client for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase — Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [vis.gl react-google-maps — Marker Clustering example](https://visgl.github.io/react-google-maps/examples/marker-clustering)
- [vis.gl react-google-maps — Custom Marker Clustering](https://visgl.github.io/react-google-maps/examples/custom-marker-clustering)
- [vis.gl react-google-maps — Geometry (Circle) example](https://visgl.github.io/react-google-maps/examples/geometry)
- [Next.js official PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — last updated 2026-05-19
- [@serwist/next npm](https://www.npmjs.com/package/@serwist/next) — v9.5.7 confirmed active (May 2026)
- [Serwist Next.js getting started](https://serwist.pages.dev/docs/next/getting-started)
- [shadowwalker/next-pwa abandoned issue #508](https://github.com/shadowwalker/next-pwa/issues/508)
