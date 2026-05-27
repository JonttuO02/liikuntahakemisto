<!-- refreshed: 2026-05-23 (Etusivu bottom sheet refactor noted) -->
# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                                  │
│                                                                            │
│  NavBar ('use client', sticky)        BottomNav ('use client', mobile)    │
├────────────────────┬──────────────────┬───────────────────────────────────┤
│   / (default)      │  /?nakyma=lista  │   /paikat/[id]   │  /suosikit    │
│   Etusivu          │  LiikuntapaikatL │   PaikkaPage      │  SuosikitPage │
│   ('use client')   │  ('use client')  │   (server)        │  (server)     │
│   GoogleMap embed  │  PaikkaKortti×N  │                   │               │
│   Karuselli        │  ('use client')  │                   │               │
│   Bottom sheet     │                  │                   │               │
└────────────────────┴──────────────────┴───────────────────┴───────────────┘
         │                         │
         │ Server Fetch (SSR)       │ Server Fetch (SSR)
         ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│             Server Components (data-fetching shell)                       │
│  app/page.tsx             — fetches all venues, routes by ?nakyma=       │
│  app/paikat/[id]/page.tsx — fetches single venue by ID                   │
│  Uses: supabase (anon key, RLS-enforced read)                            │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL + RLS)                              │
│                  Table: liikuntapaikat                                    │
│                  RLS: public SELECT ✓, authenticated writes only         │
└──────────────────────────────┬───────────────────────────────────────────┘
                               ▲
                               │ supabaseAdmin (service role, bypasses RLS)
┌──────────────────────────────┴───────────────────────────────────────────┐
│                    API Route Handlers (server-only)                       │
│                                                                            │
│  GET /api/admin/sync-paikat — Bearer token auth, calls Google Places,    │
│                               upserts into Supabase via service role     │
│  GET /api/hae-paikat        — Identical duplicate of sync-paikat         │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    External Services                                       │
│  Google Places API   (server-side, GOOGLE_PLACES_API_KEY — no referer)  │
│  Google Maps JS API  (client-side, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)     │
│  Open-Meteo          (client-side fetch in Etusivu, no key required)    │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Rendering | Responsibility | File |
|-----------|-----------|----------------|------|
| `RootLayout` | Server | Font loading (Inter + Playfair Display), NavBar, global CSS | `app/layout.tsx` |
| `Home (page)` | Server | Fetches all venues from Supabase, routes to Etusivu or LiikuntapaikatLista via `?nakyma=` | `app/page.tsx` |
| `PaikkaPage` | Server | Fetches single venue by ID, renders detail view | `app/paikat/[id]/page.tsx` |
| `SuosikitPage` | Server | Favorites placeholder (not yet implemented) | `app/suosikit/page.tsx` |
| `Etusivu` | Client | Homepage — full-screen fixed map + bottom sheet (`sheetPhase` state machine), left/right toolbars, ad carousel, AI widget, night mode toggle | `app/components/Etusivu.tsx` |
| `LiikuntapaikatLista` | Client | Venue list with text search, sport filters, price filters, staggered card grid | `app/components/LiikuntapaikatLista.tsx` |
| `PaikkaKortti` | Client | Single venue card — sport badge, name, address, description, price, CTA | `app/components/PaikkaKortti.tsx` |
| `Kartta` | Client | Standalone map with OverlayView pins and bottom sheet (currently unused — not imported anywhere) | `app/components/Kartta.tsx` |
| `Karuselli` | Client | 3D rotating ad carousel (placeholder content, no real ads yet) | `app/components/Karuselli.tsx` |
| `NavBar` | Client | Sticky top nav, centered ACTA logo, hamburger dropdown with search/favorites links | `app/components/NavBar.tsx` |
| `BottomNav` | Client | Mobile-only fixed bottom tabs — reads `?nakyma=` from URL for active state | `app/components/BottomNav.tsx` |
| `ActaLogo` | Client | Animated SVG brand mark with entrance animation | `app/components/ActaLogo.tsx` |
| `sync-paikat` | Route Handler | Auth-guarded Google Places → Supabase sync (service role upsert) | `app/api/admin/sync-paikat/route.ts` |
| `hae-paikat` | Route Handler | Identical duplicate of sync-paikat | `app/api/hae-paikat/route.ts` |

## Pattern Overview

**Overall:** Next.js 14 App Router with server component data-fetching shell + client component UI islands.

**Key Characteristics:**
- Server components fetch Supabase data once at SSR time and pass it as props — no client-side data fetching for the main listing
- All filtering (sport, price, text search) runs in-memory on the client via `useMemo` — no refetch on filter change
- View state (`?nakyma=lista` / no param) lives in the URL, enabling BottomNav deep-linking
- All map logic is client-side; the Google Maps JS API is loaded via `useJsApiLoader` inside client components
- `Kartta.tsx` exists as a standalone component but is not currently used — `Etusivu.tsx` contains its own inline map implementation

## Layers

**Server Layer (data fetching):**
- Purpose: Fetch Supabase data at request time; no client roundtrip needed for initial page load
- Location: `app/page.tsx`, `app/paikat/[id]/page.tsx`
- Contains: `async` React server components, Supabase anon client queries
- Depends on: `lib/supabase.ts` (`supabase` anon client), `lib/lajit.ts`, `lib/utils.ts`
- Used by: Client component tree receives data as props

**Client Component Layer (UI + interactivity):**
- Purpose: All interactivity — filtering, map, animations, state management
- Location: `app/components/`
- Contains: `'use client'` components, Framer Motion animations, Google Maps integration, local `useState`/`useMemo`
- Depends on: `lib/lajit.ts`, `lib/types.ts`, `lib/utils.ts`, `lib/mapStyles.ts`, `components/ui/`
- Used by: Rendered inside `<Suspense>` wrappers in server components

**API Route Layer (admin writes):**
- Purpose: Sync venue data from Google Places into Supabase
- Location: `app/api/admin/sync-paikat/route.ts`, `app/api/hae-paikat/route.ts`
- Contains: GET handlers with Bearer auth guard, Google Places Text Search + Details calls, Supabase upsert
- Depends on: `lib/supabase.ts` (`supabaseAdmin` service role client), `ADMIN_SECRET` env var, `GOOGLE_PLACES_API_KEY` env var
- Used by: External HTTP clients (cron jobs, manual curl) — not called by the app UI

**Library Layer:**
- Purpose: Shared utilities, types, constants — no business logic
- Location: `lib/`
- Contains: Supabase clients, TypeScript types, sport config, map styles, `cn()` + `hintateksti()` utilities
- Depends on: Only external packages (no intra-lib circular imports)

**UI Primitives Layer:**
- Purpose: Headless / CVA-variant base UI components
- Location: `components/ui/`
- Contains: `Button`/`buttonVariants` (CVA), `Input` (Base UI), `Badge` (Base UI + CVA)
- Depends on: `@base-ui/react`, `class-variance-authority`, `lib/utils.ts`

## Data Flow

### Primary Request Path (homepage, default view)

1. Browser requests `/` — Next.js invokes `app/page.tsx` (server) (`app/page.tsx:6`)
2. Server queries Supabase with anon key: `.from('liikuntapaikat').select(...).order('nimi')` (`app/page.tsx:11`)
3. `searchParams.nakyma` is `undefined` — renders `<Etusivu paikat={data} />` (`app/page.tsx:34`)
4. `Etusivu` hydrates client-side; Google Maps JS API loads via `useJsApiLoader` (`app/components/Etusivu.tsx:60`)
5. Weather fetched client-side from Open-Meteo on mount (`app/components/Etusivu.tsx:93`)

### List View Path

1. Browser navigates to `/?nakyma=lista`
2. Server re-runs `app/page.tsx`, checks `searchParams.nakyma === 'lista'`, renders `<LiikuntapaikatLista paikat={data} />` (`app/page.tsx:26`)
3. Client filters run in-memory via `useMemo` — no additional server fetches (`app/components/LiikuntapaikatLista.tsx:32`)

### Detail Page Path

1. Browser requests `/paikat/[id]`
2. `app/paikat/[id]/page.tsx` (server) validates ID is a positive integer, then: `.select('*').eq('id', id).single()` (`app/paikat/[id]/page.tsx:13`)
3. Calls `notFound()` if ID is invalid or row is missing

### Admin Sync Path

1. HTTP `GET /api/admin/sync-paikat` with `Authorization: Bearer <ADMIN_SECRET>`
2. Route handler validates token (`app/api/admin/sync-paikat/route.ts:61`)
3. Calls Google Places Text Search: "liikuntapaikat Tampere", 15km radius from `61.4978,23.761`
4. `Promise.all` fetches Place Details for each result (website, phone number)
5. Upserts rows via `supabaseAdmin` (service role, bypasses RLS) using `place_id` as upsert conflict key

**State Management:**
- View toggle: URL param `?nakyma=lista` / no param — written by toolbar Search link, read by `app/page.tsx` (server)
- Filter state (sport): `useState` local to `Etusivu` left toolbar dropdown; filter state (sport, price, search text) in `LiikuntapaikatLista`
- Bottom sheet phase: `sheetPhase: 'open' | 'sliding' | 'closed'` local to `Etusivu` — replaces old `kartaAuki` boolean
- Selected map marker: `useState<Liikuntapaikka | null>` local to `Etusivu` (`valittu`)
- Night/day mode: `useState` initialized from `isNightHour()`, polled every 60s via `setInterval`
- BottomNav active tab: N/A — BottomNav is a dead file, not used on any page

## Key Abstractions

**`Liikuntapaikka` type:**
- Purpose: Single source of truth for venue data shape across all server and client code
- Location: `lib/types.ts`
- Pattern: Exported interface; Phase 1 added optional fields (`hinta_kuvaus`, `aukioloajat`, `lajit_lista`, `featured`) marked optional for forward compatibility

**`lajiKonfig` / `LAJIT_FILTTERI`:**
- Purpose: Maps sport slug (`'padel'`, `'kuntosali'`, etc.) to display label, Tailwind badge classes, and hex accent color
- Location: `lib/lajit.ts`
- Pattern: Record lookup by `paikka.laji` string. Never inline sport colors in components — always derive from `lajiKonfig[paikka.laji]`

**`supabase` vs `supabaseAdmin`:**
- `supabase` — anon key, subject to RLS; used in server components for public reads
- `supabaseAdmin` — service role key, bypasses RLS; used only in API route handlers for writes
- Location: both exported from `lib/supabase.ts:6,10`
- Rule: Never import `supabaseAdmin` in any file that could be bundled client-side

**`DAY_MAP_STYLES` / `NIGHT_MAP_STYLES` / `isNightHour`:**
- Purpose: Custom Google Maps theme arrays; `isNightHour()` returns `true` when hour < 7 or >= 20
- Location: `lib/mapStyles.ts`
- Used by: `Etusivu.tsx` and `Kartta.tsx`

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Inter + Playfair Display fonts, `NavBar` (always visible), global CSS, body antialiasing

**Homepage:**
- Location: `app/page.tsx`
- Triggers: GET `/`
- Responsibilities: Full Supabase venue fetch, view routing by `searchParams.nakyma`

**Venue Detail:**
- Location: `app/paikat/[id]/page.tsx`
- Triggers: GET `/paikat/:id`
- Responsibilities: Single venue fetch by ID, `notFound()` on invalid ID or missing row

**Admin Sync:**
- Location: `app/api/admin/sync-paikat/route.ts`
- Triggers: `GET /api/admin/sync-paikat` with Bearer token
- Responsibilities: Google Places → Supabase ingestion pipeline

## URL Routing Scheme

The `?nakyma=` query param is the single authoritative view-toggle mechanism.

| URL | View | Rendered Component |
|-----|------|--------------------|
| `/` | Homepage — full-screen fixed map + bottom sheet | `Etusivu` (client) |
| `/?nakyma=lista` | Venue list with filters | `LiikuntapaikatLista` (client) |
| `/?id=<paikka_id>` | Home page with map panned to specific venue (sheet closes) | `Etusivu` (focusId effect) |
| `/paikat/[id]` | Venue detail | `PaikkaPage` (server) |
| `/suosikit` | Favorites stub | `SuosikitPage` (server) |

**Note:** The map is embedded inside `Etusivu` (default `/` view) — there is no separate `?nakyma=kartta` route. The map is `position: fixed, z-50` and covers the NavBar (`z-40`) — NavBar is only visible on non-home pages. Navigation to the list view is via the Search link in the right toolbar (`/?nakyma=lista`).

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. No worker threads.
- **Global state:** No global React context, Redux, or Zustand. All state is component-local or URL-encoded.
- **`supabaseAdmin` encapsulation:** Enforced by convention via comment in `lib/supabase.ts:8`. No automated bundle analysis to prevent accidental client import.
- **RLS:** Phase 1 migration (`supabase/migrations/20260519000001_enable_rls.sql`) enables RLS on `liikuntapaikat`. Public `SELECT` is allowed; all writes require the `authenticated` role. The anon key (used in server components) can only read. The service role key (used in API routes) bypasses RLS entirely.
- **Google Maps duplication:** `Etusivu.tsx` and `Kartta.tsx` both implement Google Maps with markers and day/night themes. `Kartta.tsx` is not currently rendered.
- **Etusivu map z-index:** Map is `position: fixed, z-50`. NavBar is `z-40`. On the home page (`/`) the map covers the NavBar entirely — NavBar is only visible on other routes.
- **No `generateStaticParams`:** All pages are dynamically rendered on every request — no ISR or SSG.
- **BottomNav:** Dead file — `app/components/BottomNav.tsx` exists on disk but is not imported anywhere. Do not reference or revive it without a dedicated phase.

## Anti-Patterns

### Duplicate API Route

**What happens:** `app/api/hae-paikat/route.ts` is a line-for-line copy of `app/api/admin/sync-paikat/route.ts`.
**Why it's wrong:** Bug fixes and feature changes must be applied twice; routes will inevitably diverge.
**Do this instead:** Delete `app/api/hae-paikat/route.ts`. Use only `app/api/admin/sync-paikat/route.ts`.

### Map Logic Duplicated Between Etusivu and Kartta

**What happens:** `Etusivu.tsx` contains a full inline Google Maps implementation (post-refactor: bottom sheet architecture). `Kartta.tsx` is a separate component with overlapping capability. `Kartta.tsx` is not rendered anywhere.
**Why it's wrong:** The cleaner `Kartta.tsx` abstractions are wasted. Any fix applied to one is not applied to the other.
**Do this instead:** Migrate `Etusivu` to use `Kartta` (or a shared `<MapWidget>` primitive) for the map portion, then delete the inline map code from `Etusivu.tsx`.

### Anon Client in Server Components for Critical Data Path

**What happens:** `app/page.tsx` and `app/paikat/[id]/page.tsx` use `supabase` (anon key) to fetch data that drives the entire page render.
**Why it's wrong:** If the `public_read` RLS policy is tightened or accidentally removed, server-side reads return empty data silently — no error thrown, just an empty venue list.
**Do this instead:** Server components that own critical data should use `supabaseAdmin` (service role) to guarantee reads are never gated by RLS policy changes. Reserve the anon client for future client-side calls that should respect user auth context.

## Error Handling

**Strategy:** Next.js built-in error boundaries + explicit `notFound()`.

**Patterns:**
- `app/error.tsx` — catches uncaught runtime errors; shows Finnish "Jotain meni pieleen" UI with retry and home button (`'use client'`)
- `app/not-found.tsx` — shown when `notFound()` is called (invalid venue ID, missing DB row)
- `app/loading.tsx` — skeleton UI shown during server component suspense (animated card placeholders)
- API routes return JSON `{ error: string }` with appropriate HTTP status codes (401, 403, 500, 502)
- Supabase query errors in `app/page.tsx` render an inline `<p className="text-red-500">` error (not routed to `error.tsx`)
- Weather fetch failure in `Etusivu` is silently swallowed (`.catch(() => {})`) — widget stays in initial state

## Cross-Cutting Concerns

**Logging:** `console.error(error)` in `app/error.tsx`. No structured logging framework or external error service.
**Validation:** ID validated in `app/paikat/[id]/page.tsx` (`Number.isInteger(id) && id >= 1`). No Zod or runtime schema validation on API inputs or Supabase responses.
**Authentication:** Admin API routes require `Authorization: Bearer ${ADMIN_SECRET}`. All venue data is public (no user login). Supabase RLS enforces this at the DB level.

---

*Architecture analysis: 2026-05-20*
