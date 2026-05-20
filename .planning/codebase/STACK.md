# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- TypeScript 5.x — all source files (`.ts`, `.tsx`); strict mode enabled (`"strict": true` in `tsconfig.json`)

**Secondary:**
- CSS — via Tailwind utility classes; minimal custom CSS in `app/globals.css`

## Runtime

**Environment:**
- Node.js (LTS recommended; no version pinned — no `.nvmrc` or `.node-version` file)
- Target: browser + Node.js server (Next.js hybrid — server components run on Node, client components in browser)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 14.2.35 — App Router, React Server Components, file-system routing
  - Config: `next.config.mjs` (empty — no custom options set)
  - App dir: `app/`
  - API routes: `app/api/` (Route Handlers)

**React:**
- React 18.x — concurrent features, Suspense, lazy loading used throughout
- React DOM 18.x

## Styling

**Tailwind CSS v3.4.1**
- Config: `tailwind.config.ts`
- Content paths: `./pages/**`, `./components/**`, `./app/**`
- No custom plugins; one extended color token (`background`, `foreground`) via CSS variables
- CSS entry: `app/globals.css` — uses `@tailwind base/components/utilities` directives (v3 syntax — NOT v4)
- PostCSS config: `postcss.config.mjs` (tailwindcss plugin only)

**CSS Variables (defined in `app/globals.css`):**
- `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--border`, `--ring`, `--radius`
- Custom easing curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` and `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`

**Utility helpers:**
- `clsx` 2.1.1 — conditional class names
- `tailwind-merge` 3.6.0 — resolves conflicting Tailwind classes
- Combined in `lib/utils.ts` as `cn()` function

## UI Component Libraries

**Base UI (`@base-ui/react` 1.4.1):**
- Headless React component primitives (unstyled)
- Used as the underlying primitive layer for custom components
- Note: `components.json` references `shadcn` CLI (style: `base-nova`) for component scaffolding

**shadcn CLI (4.7.0, devDependency):**
- Used to scaffold components into `components/ui/`
- `buttonVariants()` from `components/ui/button.tsx` used on `<a>` tags (not `asChild`)

**lucide-react 1.16.0:**
- SVG icon library; used throughout map pins and UI components

## Animation

**Framer Motion 12.38.0:**
- Primary animation library for all interactive animations
- Used APIs: `motion`, `AnimatePresence`, `useScroll`, `useTransform`
- Stagger grid animations via `variants` + `staggerChildren` in `app/components/LiikuntapaikatLista.tsx`
- Map pin entrance animations in `app/components/Kartta.tsx`
- All durations follow Emil Kowalski philosophy: hover 180ms, card enter 280-350ms, view transitions 150ms

## State Management

**No global state library.** State is managed via:
- React `useState` / `useMemo` (local component state)
- URL search params (`useSearchParams`, `useRouter`) for view mode (`?nakyma=kartta`)
- Supabase data fetched server-side in `app/page.tsx` and `app/paikat/[id]/page.tsx` and passed as props

## Mapping

**`@react-google-maps/api` 2.20.8:**
- React wrapper for Google Maps JS API
- Used in `app/components/Kartta.tsx` with `GoogleMap`, `OverlayView`, `useJsApiLoader`
- Custom day/night map themes defined in `lib/mapStyles.ts` (Aubergine night style)

**`@googlemaps/markerclusterer` 2.6.2:**
- Installed; not yet actively wired into the map component

## Build Tooling

- Next.js built-in webpack/Turbopack bundler
- TypeScript compilation: `noEmit: true` (Next.js handles transpilation)
- `moduleResolution: "bundler"` in `tsconfig.json`
- Path alias: `@/*` → `./` (repo root)
- ESLint 8.x with `eslint-config-next` 14.2.35 (`next lint` script)

## Key Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.2.35 | App framework |
| `react` / `react-dom` | ^18 | UI runtime |
| `typescript` | ^5 | Language |
| `tailwindcss` | ^3.4.1 | Styling |
| `framer-motion` | ^12.38.0 | Animations |
| `@base-ui/react` | ^1.4.1 | Headless UI primitives |
| `@supabase/supabase-js` | ^2.105.4 | Database client |
| `@react-google-maps/api` | ^2.20.8 | Google Maps React wrapper |
| `@googlemaps/markerclusterer` | ^2.6.2 | Marker clustering |
| `clsx` | ^2.1.1 | Conditional class names |
| `tailwind-merge` | ^3.6.0 | Tailwind class deduplication |
| `class-variance-authority` | ^0.7.1 | Component variant styling (shadcn) |
| `lucide-react` | ^1.16.0 | Icons |
| `shadcn` | ^4.7.0 | Component scaffolding CLI |

## TypeScript Configuration

- `"strict": true` — all strict checks enabled
- `"noEmit": true` — Next.js handles JS output
- `"module": "esnext"`, `"moduleResolution": "bundler"`
- `"jsx": "preserve"` — Next.js handles JSX transform
- `"incremental": true` — build cache via `tsconfig.tsbuildinfo`
- `"paths": { "@/*": ["./*"] }` — root-relative imports

## Platform Requirements

**Development:**
- Node.js (LTS recommended; no version pinned)
- npm
- `.env.local` with all required env vars (see INTEGRATIONS.md)

**Production:**
- Any Node.js-capable hosting (Vercel is the natural target for Next.js 14 App Router)
- Supabase project (PostgreSQL backend with RLS enabled)
- Google Cloud project with Maps JS API and Places API enabled

---

*Stack analysis: 2026-05-20*
