# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```
liikuntahakemisto/
├── app/                                  # Next.js App Router root
│   ├── api/
│   │   ├── admin/
│   │   │   └── sync-paikat/
│   │   │       └── route.ts              # GET: Bearer-guarded Google Places → Supabase sync
│   │   └── hae-paikat/
│   │       └── route.ts                  # GET: Identical duplicate of sync-paikat (unused)
│   ├── components/                       # Feature client components (all 'use client')
│   │   ├── ActaLogo.tsx                  # Animated SVG brand mark with entrance animation
│   │   ├── BottomNav.tsx                 # Fixed mobile bottom tabs (sm:hidden)
│   │   ├── Etusivu.tsx                   # Homepage — 3D map widget, carousel, weather, night mode
│   │   ├── Kartta.tsx                    # Standalone Google Map component (currently unused)
│   │   ├── Karuselli.tsx                 # 3D rotating ad carousel
│   │   ├── LiikuntapaikatLista.tsx       # Venue list with search + sport/price filters
│   │   ├── NavBar.tsx                    # Sticky top nav with hamburger dropdown
│   │   └── PaikkaKortti.tsx              # Single venue card
│   ├── fonts/                            # Local font files (GeistVF.woff, GeistMonoVF.woff)
│   ├── paikat/
│   │   └── [id]/
│   │       └── page.tsx                  # SSR venue detail page
│   ├── suosikit/
│   │   └── page.tsx                      # Favorites placeholder (stub, not implemented)
│   ├── acta-logo-full.svg               # Brand asset (dark)
│   ├── acta-logo-full-white.svg         # Brand asset (light)
│   ├── acta-symbol.svg                  # Brand asset (dark)
│   ├── acta-symbol-white.svg            # Brand asset (light)
│   ├── error.tsx                         # Error boundary UI (Finnish copy, 'use client')
│   ├── favicon.ico
│   ├── globals.css                       # Tailwind directives + CSS custom properties
│   ├── layout.tsx                        # Root layout: fonts, NavBar, <main>
│   ├── loading.tsx                       # Skeleton loading UI (server component)
│   ├── not-found.tsx                     # 404 page (Finnish copy)
│   └── page.tsx                          # Homepage: SSR Supabase fetch, view routing
├── components/
│   └── ui/                               # Shared UI primitives (no business logic)
│       ├── badge.tsx                     # Badge with CVA variants
│       ├── button.tsx                    # Button + buttonVariants (CVA)
│       └── input.tsx                     # Input wrapping @base-ui/react
├── lib/                                  # Shared utilities and configuration
│   ├── lajit.ts                          # Sport type config: labels, colors, filter list
│   ├── mapStyles.ts                      # Google Maps day/night themes + isNightHour()
│   ├── supabase.ts                       # Supabase anon client + supabaseAdmin (service role)
│   ├── types.ts                          # Liikuntapaikka TypeScript interface
│   └── utils.ts                          # cn() (clsx+twMerge) + hintateksti() formatter
├── supabase/
│   └── migrations/
│       ├── 20260519000000_add_phase1_columns.sql  # Phase 1: hinta_kuvaus, aukioloajat, lajit_lista, featured
│       └── 20260519000001_enable_rls.sql          # Phase 1: RLS enable + public_read policy
├── .planning/                            # GSD planning artifacts (committed)
│   ├── codebase/                         # Codebase maps (this directory)
│   ├── phases/                           # Phase plans
│   └── research/                         # Research notes
├── components.json                       # shadcn CLI configuration
├── CLAUDE.md                             # Project guidelines and design system
├── next.config.ts                        # Next.js config (minimal, no customization)
├── package.json                          # Dependencies and scripts
├── postcss.config.mjs                    # PostCSS (Tailwind plugin)
├── tailwind.config.ts                    # Tailwind v3 content paths + theme
└── tsconfig.json                         # TypeScript config, @/ alias → project root
```

## Directory Purposes

**`app/` — Next.js App Router:**
- File-system routing. Files named `page.tsx` define routes; `layout.tsx` wraps all routes.
- Page files are server components by default (async, no `'use client'`).
- `error.tsx` and `not-found.tsx` are special Next.js error boundary files.

**`app/components/` — Feature client components:**
- All files begin with `'use client'`.
- Feature-level components — they contain domain logic (filtering, map state, sport config lookups, animations).
- Not generic UI primitives; they import from `lib/` and know about `Liikuntapaikka`.

**`app/api/` — API Route Handlers:**
- Follows Next.js App Router convention: `route.ts` exports named HTTP method handlers.
- Both routes are admin-only data ingestion endpoints, not called by the app UI.
- `app/api/admin/sync-paikat/route.ts` is the canonical implementation; `app/api/hae-paikat/route.ts` is an unused duplicate.

**`components/ui/` — Shared UI primitives:**
- Generic, reusable components with no business logic or domain knowledge.
- `button.tsx` uses CVA for type-safe variant classes; `input.tsx` and `badge.tsx` wrap `@base-ui/react`.
- Import these in both feature components and server pages.

**`lib/` — Shared library code:**
- Framework-agnostic; safe to import from server components, client components, and API routes alike.
- No circular imports within this directory.
- `lajit.ts` is the canonical source of truth for sport display config — never duplicate its values in components.
- `supabase.ts` exports two clients: `supabase` (anon, read-only after RLS) and `supabaseAdmin` (service role, server-only).

**`supabase/migrations/` — Database schema:**
- SQL migrations tracked in source control.
- Apply manually via Supabase CLI or dashboard.

## Key File Locations

**Entry Points:**
- `app/layout.tsx` — Root HTML shell, fonts, NavBar
- `app/page.tsx` — Homepage SSR fetch + view routing
- `app/paikat/[id]/page.tsx` — Venue detail SSR
- `app/suosikit/page.tsx` — Favorites stub

**Configuration:**
- `tailwind.config.ts` — Tailwind v3 content paths (`app/**`, `components/**`, `lib/**`)
- `app/globals.css` — Tailwind directives, CSS custom properties (`--ease-out`, `--font-sans`, `--font-serif`, glassmorphism classes)
- `tsconfig.json` — `@/` path alias maps to project root
- `components.json` — shadcn CLI config

**Core Library:**
- `lib/lajit.ts` — Extend here to add new sport types
- `lib/types.ts` — `Liikuntapaikka` interface — extend here for new DB columns
- `lib/supabase.ts` — All Supabase access goes through this module
- `lib/mapStyles.ts` — Map theme arrays; extend here for new map styling
- `lib/utils.ts` — `cn()` and `hintateksti()` — add generic formatters here

**Feature Components (by complexity):**
- `app/components/Etusivu.tsx` — Largest component (~530 lines); homepage with inline Google Maps, carousel, weather, night mode
- `app/components/LiikuntapaikatLista.tsx` — Venue list with all filter logic (~175 lines)
- `app/components/Kartta.tsx` — Standalone map component (~285 lines); not currently rendered
- `app/components/PaikkaKortti.tsx` — Venue card (~115 lines)
- `app/components/Karuselli.tsx` — Ad carousel (~110 lines)
- `app/components/NavBar.tsx` — Top nav (~80 lines)
- `app/components/BottomNav.tsx` — Mobile tabs (~50 lines)
- `app/components/ActaLogo.tsx` — Logo animation (~75 lines)

**Admin & Data Ingestion:**
- `app/api/admin/sync-paikat/route.ts` — The only production admin endpoint; requires `ADMIN_SECRET` Bearer token

## Component Hierarchy

```
app/layout.tsx (server)
└── NavBar.tsx (client, sticky z-50)
    └── ActaLogo.tsx (client, animated SVG)
app/layout.tsx → <main>
├── app/page.tsx (server) — one of:
│   ├── Etusivu.tsx (client)          [default /]
│   │   └── Karuselli.tsx (client)
│   │   └── GoogleMap × 2 (preview + fullscreen, inline in Etusivu)
│   └── LiikuntapaikatLista.tsx (client)    [/?nakyma=lista]
│       └── PaikkaKortti.tsx (client) × N
├── app/paikat/[id]/page.tsx (server)
└── app/suosikit/page.tsx (server)
BottomNav.tsx (client, sm:hidden, fixed bottom)   [NOTE: not in layout.tsx currently]
```

**Note:** `Kartta.tsx` exists at `app/components/Kartta.tsx` but is not imported by any active component. It is a standalone map implementation intended to replace the inline map in `Etusivu.tsx`.

## Import Direction Rules

- Server pages (`app/page.tsx`, `app/paikat/[id]/page.tsx`) import from: `lib/`, `app/components/`, `components/ui/`
- Client components import from: `lib/`, `components/ui/`, and sibling `app/components/` files
- `components/ui/` imports from: `lib/utils.ts` and external packages only
- `lib/` imports from: external packages only
- No component imports from `app/api/`
- `supabaseAdmin` from `lib/supabase.ts` must only be imported in `app/api/` route handlers

## Where Business Logic Lives

| Concern | Location |
|---------|----------|
| Supabase DB queries (reads) | `app/page.tsx`, `app/paikat/[id]/page.tsx` |
| Supabase DB writes (upserts) | `app/api/admin/sync-paikat/route.ts` |
| Sport type config (labels, colors) | `lib/lajit.ts` — single source of truth |
| Filter logic (sport, text, price) | `app/components/LiikuntapaikatLista.tsx` (`useMemo`) |
| Map state (selected pin, open/close) | `app/components/Etusivu.tsx` (`useState`) |
| Map themes (day/night styles) | `lib/mapStyles.ts` |
| Weather data fetch | `app/components/Etusivu.tsx` (`useEffect` → Open-Meteo) |
| Night mode detection | `lib/mapStyles.ts` (`isNightHour()`) |
| Admin auth guard | `app/api/admin/sync-paikat/route.ts` (Bearer token check) |
| Google Places integration | `app/api/admin/sync-paikat/route.ts` |
| Utility functions (formatting) | `lib/utils.ts` |
| Generic UI components | `components/ui/` |
| Venue TypeScript types | `lib/types.ts` |

## Naming Conventions

**Files:**
- Next.js special files: lowercase (`page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`, `loading.tsx`)
- React feature components: PascalCase (`Etusivu.tsx`, `PaikkaKortti.tsx`, `NavBar.tsx`)
- Library modules: camelCase (`lajit.ts`, `supabase.ts`, `utils.ts`, `mapStyles.ts`, `types.ts`)
- UI primitives: lowercase (`button.tsx`, `input.tsx`, `badge.tsx`)

**Components and identifiers:**
- Feature/domain components: Finnish names (`Etusivu` = home, `Kartta` = map, `PaikkaKortti` = venue card, `Karuselli` = carousel)
- Generic UI primitives: English names (`Button`, `Input`, `Badge`)
- Domain variables: Finnish camelCase (`paikat`, `laji`, `aktiivinen`, `valittu`, `suodatettu`, `kartaAuki`, `nakyma`)
- Constants: `SCREAMING_SNAKE_CASE` (`TAMPERE`, `LAJIT_FILTTERI`, `EASE_MAP`, `NAV_H`)
- Types/Interfaces: PascalCase (`Liikuntapaikka`, `LajiKonfig`, `SaaTiedot`, `PlacesResult`)

## Where to Add New Code

**New page/route:**
- Create `app/[route-name]/page.tsx` (server component by default)
- Create `app/[route-name]/layout.tsx` only if that route needs its own layout wrapper

**New feature component (interactive, uses hooks):**
- Create `app/components/ComponentName.tsx` with `'use client'` as the first line
- Import `Liikuntapaikka` type from `lib/types.ts`
- Import sport config from `lib/lajit.ts` — never inline sport colors

**New shared UI primitive:**
- Create `components/ui/component-name.tsx`
- Use CVA for variant props; wrap `@base-ui/react` for accessible headless behavior
- No domain knowledge, no Supabase imports

**New sport type:**
- Add entry to `lajiKonfig` in `lib/lajit.ts` with `label`, `badgeTw`, `accentBg`, `color`
- Add sport slug to `LAJIT_FILTTERI` array in `lib/lajit.ts` to expose in filter UI
- Do not add color or label anywhere else

**New DB column:**
- Add to the `Liikuntapaikka` interface in `lib/types.ts`
- Add as optional (`field?: type | null`) for forward compatibility while the migration rolls out
- Add a SQL migration file in `supabase/migrations/`

**New admin API endpoint:**
- Create `app/api/admin/[endpoint-name]/route.ts`
- Add Bearer token guard at the top of the handler (same pattern as `sync-paikat`)
- Use `supabaseAdmin` for writes, never the anon `supabase` client

**New utility function:**
- Add to `lib/utils.ts` for generic pure functions (formatting, class merging)

**New map theme:**
- Add style array to `lib/mapStyles.ts` following the existing `DAY_MAP_STYLES` / `NIGHT_MAP_STYLES` pattern

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow artifacts (codebase maps, phase plans, research)
- Generated: No — maintained by agents and humans
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and dev cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm packages
- Generated: Yes (`npm install`)
- Committed: No

**`supabase/migrations/`:**
- Purpose: SQL schema migrations — version-controlled DB changes
- Generated: No — hand-authored
- Committed: Yes; apply via `supabase db push` or Supabase dashboard

**`app/fonts/`:**
- Purpose: Local font files (`GeistVF.woff`, `GeistMonoVF.woff`)
- Generated: No
- Committed: Yes (bundled with app)

---

*Structure analysis: 2026-05-20*
