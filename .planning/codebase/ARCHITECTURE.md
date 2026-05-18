<!-- refreshed: 2026-05-19 -->
# Architecture

**Analysis Date:** 2026-05-19

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router (SSR)                         │
│                                                                         │
│   app/layout.tsx         app/page.tsx        app/paikat/[id]/page.tsx   │
│   (NavBar + BottomNav)   (Home — SSR)        (Detail — SSR)             │
└──────────────┬──────────────────┬───────────────────────┬───────────────┘
               │                  │                       │
               ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Client Components                                │
│                                                                         │
│  Etusivu.tsx         LiikuntapaikatLista.tsx    NavBar.tsx              │
│  (map+AI widget)     (list/map toggle)          BottomNav.tsx           │
│                      PaikkaKortti.tsx           Kartta.tsx              │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
           ┌─────────────┐  ┌──────────┐  ┌──────────────────┐
           │  Supabase   │  │ Google   │  │  Open-Meteo API  │
           │ (Postgres)  │  │  Maps /  │  │  (weather, CSR)  │
           │  lib/       │  │  Places  │  └──────────────────┘
           │  supabase.ts│  └──────────┘
           └─────────────┘
                    ▲
                    │
     ┌──────────────────────────┐
     │  app/api/hae-paikat/     │
     │  route.ts (API Route)    │
     │  Google Places → upsert  │
     └──────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| RootLayout | Font, global CSS, NavBar, BottomNav wrapper | `app/layout.tsx` |
| Home (page) | SSR data fetch from Supabase, route to Etusivu or LiikuntapaikatLista | `app/page.tsx` |
| PaikkaPage | SSR single-venue detail fetch, static detail UI | `app/paikat/[id]/page.tsx` |
| SuosikitPage | Placeholder page (not implemented) | `app/suosikit/page.tsx` |
| Etusivu | Default home view: scroll-driven map expand, AI weather widget, filter pills, bottom sheet | `app/components/Etusivu.tsx` |
| LiikuntapaikatLista | List/map toggle view with search, sport filters, price filters, staggered card grid | `app/components/LiikuntapaikatLista.tsx` |
| PaikkaKortti | Individual venue card with sport accent bar, badge, CTA button | `app/components/PaikkaKortti.tsx` |
| Kartta | Standalone Google Map with markers + InfoWindow for the list view's map tab | `app/components/Kartta.tsx` |
| NavBar | Sticky top nav with logo link | `app/components/NavBar.tsx` |
| BottomNav | Fixed mobile nav (4 tabs), reads URL params to determine active tab | `app/components/BottomNav.tsx` |
| hae-paikat route | API route: fetches Google Places API, upserts results into Supabase | `app/api/hae-paikat/route.ts` |

## Pattern Overview

**Overall:** SSR data-fetch shell + hydrated client component tree

**Key Characteristics:**
- All database reads happen in server components (`app/page.tsx`, `app/paikat/[id]/page.tsx`). Data is fetched once at request time and passed down as props.
- Client components handle all interactivity: filtering, search, view toggles, animations, map state.
- The `Liikuntapaikka` TypeScript type is defined once in `app/components/LiikuntapaikatLista.tsx` and imported by other components (`PaikkaKortti.tsx`, `Etusivu.tsx`, `Kartta.tsx`).
- URL search params drive view mode and BottomNav active state — no external state management library.

## Layers

**Server Layer (data fetching):**
- Purpose: Fetch data from Supabase, pass to client components as props
- Location: `app/page.tsx`, `app/paikat/[id]/page.tsx`
- Contains: `async` page components, Supabase queries, `notFound()` calls
- Depends on: `lib/supabase.ts`, `lib/lajit.ts`
- Used by: Next.js App Router

**Client Layer (UI + interactivity):**
- Purpose: All rendered UI, filtering, animation, map interaction
- Location: `app/components/`
- Contains: `'use client'` components, framer-motion animations, Google Maps integration, local state
- Depends on: Props from server layer, `lib/lajit.ts`, `components/ui/`
- Used by: Server page components (rendered as children)

**Library Layer (shared utilities):**
- Purpose: Shared constants, clients, and helpers
- Location: `lib/`
- Contains: Supabase client singleton, sport type config, `cn()` utility
- Depends on: Environment variables
- Used by: Both server and client layers

**API Route Layer (admin/data ingestion):**
- Purpose: Server-side integration with Google Places API to populate Supabase
- Location: `app/api/hae-paikat/route.ts`
- Contains: `GET` handler, Places text search, place detail fetching, Supabase upsert
- Depends on: `GOOGLE_PLACES_API_KEY` (server-only), `lib/supabase.ts`
- Used by: Manual trigger (not called by the app UI)

**UI Primitives Layer:**
- Purpose: Headless UI components with CVA variants
- Location: `components/ui/`
- Contains: `Button`/`buttonVariants` (CVA), `Input` (Base UI), `Badge` (Base UI + CVA)
- Depends on: `@base-ui/react`, `class-variance-authority`, `lib/utils.ts`
- Used by: App components and server pages

## Data Flow

### Primary Request Path (home page, default view)

1. Browser requests `/` → Next.js App Router invokes `app/page.tsx` (server)
2. `app/page.tsx` calls `supabase.from('liikuntapaikat').select(...).order('nimi')` — full table fetch
3. If `searchParams.view === 'lista'`, renders `<LiikuntapaikatLista paikat={data} />`, otherwise `<Etusivu paikat={data} />`
4. Client component hydrates; filtering (sport, price, text search) runs entirely in-browser via `useMemo`
5. No subsequent server fetches for filtering — all data is in memory client-side

### Detail Page Path

1. Browser requests `/paikat/[id]` → `app/paikat/[id]/page.tsx` (server)
2. Validates `id` is a positive integer, else `notFound()`
3. `supabase.from('liikuntapaikat').select('*').eq('id', id).single()` — single row fetch
4. Renders static detail UI with `lajiKonfig` lookup for sport badge/colors
5. No client component — entire page is a server component

### Data Ingestion Path (admin only)

1. GET request to `/api/hae-paikat` (manual trigger, e.g., curl or browser)
2. Calls Google Places Text Search API: `"liikuntapaikat Tampere"`, radius 15km
3. For each result, calls Google Place Details API in parallel (`Promise.all`) for website + phone
4. Upserts all rows into Supabase `liikuntapaikat` table on conflict `place_id`
5. Returns JSON summary: `{ loydetty, tallennettu, website_loydetty }`

### Weather Fetch (Etusivu, client-side)

1. `Etusivu` mounts → `useEffect` fetches `https://api.open-meteo.com/v1/forecast` with Tampere coordinates
2. Parses `temperature_2m` and `weather_code` into emoji + activity suggestion
3. Weather data drives the AI widget and the Dynamic Island pill

**State Management:**
- Filter state (sport, price, search text): `useState` inside `LiikuntapaikatLista`
- View mode (lista/kartta): URL search param `?nakyma=kartta`, read via `useSearchParams`, written via `useRouter.push`
- Selected map marker: `useState<Liikuntapaikka | null>` inside `Etusivu` and `Kartta`
- Scroll-driven animation state: Framer Motion `useScroll` + `useTransform` inside `Etusivu`
- BottomNav active tab: derived from `usePathname()` + `useSearchParams()` — no local state

## Key Abstractions

**`Liikuntapaikka` type:**
- Purpose: Single source-of-truth TypeScript type for venue data
- Defined in: `app/components/LiikuntapaikatLista.tsx` (exported)
- Used by: `PaikkaKortti.tsx`, `Etusivu.tsx`, `Kartta.tsx`, `app/paikat/[id]/page.tsx`
- Shape: `{ id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin }`

**`lajiKonfig` / `LajiKonfig`:**
- Purpose: Maps sport slug → display label, badge Tailwind classes, accent color class
- Defined in: `lib/lajit.ts`
- Used by: All components that show sport badges or color bars
- Rule: Never inline sport colors in components — always use `lajiKonfig`

**`buttonVariants` (CVA):**
- Purpose: Consistent button styling via class-variance-authority
- Defined in: `components/ui/button.tsx`
- Used on `<a>` tags as well as `<button>` tags (e.g., `app/paikat/[id]/page.tsx` uses `buttonVariants()` on an `<a>`)

## Entry Points

**App Shell:**
- Location: `app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Applies Inter font, global CSS, renders `NavBar`, `BottomNav` (in `Suspense`), and `<main>` with `pb-16 sm:pb-0`

**Home Page:**
- Location: `app/page.tsx`
- Triggers: Route `/`
- Responsibilities: Full Supabase fetch, conditional render of `Etusivu` (default) or `LiikuntapaikatLista` (when `?view=lista`)

**Detail Page:**
- Location: `app/paikat/[id]/page.tsx`
- Triggers: Route `/paikat/[id]`
- Responsibilities: Single venue fetch, `notFound()` on invalid id or missing row

**API Route:**
- Location: `app/api/hae-paikat/route.ts`
- Triggers: `GET /api/hae-paikat` (manual admin trigger)
- Responsibilities: Google Places ingestion pipeline, Supabase upsert

## Architectural Constraints

- **Rendering:** `app/page.tsx` and `app/paikat/[id]/page.tsx` are async server components — they run at request time (SSR), not build time (SSG). There is no `generateStaticParams` or `cache`/`revalidate` config, so all pages are dynamically rendered on every request.
- **Supabase client:** A single module-level singleton exported from `lib/supabase.ts` using the public anon key. This client is imported in both server components and the API route — the anon key is safe for public reads, but there is no server-only (service role) client.
- **Global state:** No global state store (no Redux, Zustand, Context). All state is local to components or encoded in URL params.
- **Lazy loading:** `Kartta` is lazy-loaded in `LiikuntapaikatLista.tsx` via `React.lazy` + `Suspense` to avoid loading the Google Maps JS bundle until the map tab is activated.
- **BottomNav Suspense:** `BottomNav` uses `useSearchParams` which requires `Suspense` wrapping. It is wrapped in `app/layout.tsx`.
- **Font:** Inter loaded via `next/font/google` in `app/layout.tsx`, applied as CSS variable `--font-sans` to the `<html>` element.

## Anti-Patterns

### Duplicate `hintateksti` helper

**What happens:** The `hintateksti` formatting function is defined identically in three files: `app/components/Etusivu.tsx`, `app/components/PaikkaKortti.tsx`, and `app/paikat/[id]/page.tsx`.
**Why it's wrong:** Any change to price display logic must be made in three places.
**Do this instead:** Extract to `lib/utils.ts` or a new `lib/format.ts` and import from there.

### Sport colors duplicated in `Kartta.tsx`

**What happens:** `app/components/Kartta.tsx` defines its own `lajiVari` object with inline color hex values for the InfoWindow badge.
**Why it's wrong:** Violates the CLAUDE.md rule that sport colors must come from `lib/lajit.ts`. These colors can drift from the canonical `lajiKonfig`.
**Do this instead:** Derive InfoWindow badge styles from `lajiKonfig[laji].badgeTw` or add hex values to `LajiKonfig` in `lib/lajit.ts`.

### `Liikuntapaikka` type defined in a component file

**What happens:** The canonical `Liikuntapaikka` type is exported from `app/components/LiikuntapaikatLista.tsx`, which is a UI component.
**Why it's wrong:** Types for domain data should not be colocated with UI components; it creates a confusing import dependency where `Etusivu.tsx` and `PaikkaKortti.tsx` import a type from a sibling component.
**Do this instead:** Move the type to `lib/types.ts` or `lib/supabase.ts`.

## Error Handling

**Strategy:** Minimal — errors surface as inline JSX or trigger Next.js `notFound()`.

**Patterns:**
- Supabase error on home page: renders an inline `<p className="text-red-500">` error message in place of the full page
- Missing venue on detail page: calls `notFound()` which triggers Next.js 404
- Google Places API errors in the route handler: returns structured `NextResponse.json({ error })` with appropriate HTTP status codes (500, 502, 403)
- Weather fetch failure in `Etusivu`: silently caught (`.catch(() => {})`) — widget stays in skeleton state

## Cross-Cutting Concerns

**Logging:** No logging framework — `console` not used. Errors are returned as HTTP responses from the API route.
**Validation:** Input validation is minimal: `id` param is checked with `Number.isInteger` + `id >= 1` on the detail page. No Zod or similar schema validation.
**Authentication:** None — all pages are fully public. Supabase is accessed with the anon key only. No auth routes or protected pages.

---

*Architecture analysis: 2026-05-19*
