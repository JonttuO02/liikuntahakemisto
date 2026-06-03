# Project Research Summary

**Project:** Liikuntahakemisto (AKTIIVI) — v1.6 milestone
**Domain:** Adding FI/EN i18n toggle + custom SVG sport icon system to existing Next.js 14 App Router + Google Maps PWA
**Researched:** 2026-06-03
**Confidence:** HIGH

## Executive Summary

v1.6 adds two orthogonal features: a FI/EN language toggle and a unified custom SVG sport icon system. Both interact with the same components (NavBar, filter pills, card badges, map pins), making sequencing matter. SVG icon work must come first — it consolidates two divergent icon registries (`lib/lajit.ts` Lucide components and `SportPin.tsx` inline path strings) into a single `lib/sportIcons.ts` path-string registry. Once that registry exists, i18n wiring is additive (~83 UI strings across ~8 files).

## Stack Additions

**One new runtime dependency:** `next-intl ^4.13.0`

No SVG library added. The path-string approach (`lib/sportIcons.ts`) has zero new dependencies.

| Addition | Version | Why |
|----------|---------|-----|
| `next-intl` | `^4.13.0` | App Router RSC support, without-routing mode, cookie-based, ~14 KB gzip |
| `lib/sportIcons.ts` | — (new file) | Zero-dep: `SPORT_SVG_PATHS` + `SportIcon` component + `sportIconSvgString()` |

**Rejected:** `@svgr/webpack` — Turbopack friction in Next.js 14, doesn't solve AdvancedMarker constraint (still needs path strings), independently rejected by 3 of 4 research files.

## Feature Approach

### SVG Icon System
- Single `lib/sportIcons.ts` registry with raw SVG path strings (35 icons from zip)
- Thin `SportIcon` React component wraps paths — drop-in for Lucide icons in React contexts
- `sportIconSvgString()` factory for `SportPin.tsx` (Google Maps DOM, non-React)
- Eliminates two divergent registries + removes `PaikkaKortti.tsx` local duplicate

### i18n FI/EN Toggle
- `NEXT_LOCALE` cookie (not localStorage) — readable server-side, no hydration mismatch
- `messages/fi.json` + `messages/en.json` (~83 keys each), auto-precached by Serwist via JS bundle
- Server Action: sets cookie + `revalidatePath('/', 'layout')`; NavBar calls this + `router.refresh()`
- `router.refresh()` re-renders RSC in-place without remounting client state (map pan, filters survive)
- Sport names `Padel/Tennis/Jooga` stay unchanged (international proper nouns); `Kuntosali→Gym`, `Uinti→Swimming`

### Anti-features (do not build)
- URL-based locale routing — breaks existing URL contract
- `@svgr/webpack` — Turbopack friction + redundant with path-string approach
- localStorage for locale — not server-readable, causes hydration mismatch

## Critical Pitfalls

### 1 — Hydration mismatch from locale storage (CRITICAL)
**Risk:** localStorage read in initial state causes server/client render divergence.
**Prevention:** Use `NEXT_LOCALE` cookie — server reads it in `i18n/request.ts` and renders correct locale on first request. No hydration flash.

### 2 — `lib/lajit.ts` type chain breaks all consumers (CRITICAL)
**Risk:** `SPORT_ICONS: Record<string, LucideIcon>` consumed in 5+ files. Changing type without interface definition errors everywhere simultaneously.
**Prevention:** Define `SportIconComponent = React.FC<{className?: string; style?: React.CSSProperties}>` first. Run `tsc --noEmit` to confirm. `PaikkaKortti.tsx` has a fully duplicated local registry — remove it separately.

### 3 — Serwist precache gap for `public/` SVG files (CRITICAL for PWA)
**Risk:** `@serwist/next` skips `globPublicPatterns` when `additionalPrecacheEntries` is set (this app already sets it). SVGs in `public/` won't be offline-cached.
**Prevention:** Use path-string approach — icons ship in JS bundle, precached automatically. Do NOT place SVG files in `public/icons/`.

### 4 — SVG DOM injection cannot use Tailwind or CSS variables (CRITICAL for map pins)
**Risk:** `element.innerHTML = svgString` with Tailwind classes silently breaks in Google Maps sandbox.
**Prevention:** Keep map pins on the React portal path (`SportPin.tsx` via `AdvancedMarker` children). Use inline `style` attributes if DOM string injection ever needed.

## Architecture

### New Files
| File | Purpose |
|------|---------|
| `lib/sportIcons.ts` | Single SVG icon registry (paths + SportIcon + sportIconSvgString) |
| `messages/fi.json` | Finnish UI strings (~83 keys) |
| `messages/en.json` | English UI strings (~83 keys) |
| `i18n/request.ts` | next-intl: reads `NEXT_LOCALE` cookie server-side |
| `actions/locale.ts` | Server Action: sets cookie + revalidatePath |

### Modified Files
| File | Change |
|------|--------|
| `lib/lajit.ts` | Remove Lucide imports, add `labelEn` field |
| `app/layout.tsx` | Async, wrap in `NextIntlClientProvider` (outside `MapProvider`) |
| `SportPin.tsx` | Import paths from `lib/sportIcons.ts` |
| `DiagonaalKortti.tsx`, `PaikkaKortti.tsx`, `Etusivu.tsx` | SVG icon swap + translation hooks |
| `NavBar.tsx` | FI/EN toggle button + translation hook |

## Build Order

**Phase 1 — SVG Icon Consolidation (prerequisite):**
1. Create `lib/sportIcons.ts` with `SportIconComponent` type + 35 paths extracted from zip
2. Update `SportPin.tsx` — import swap from new registry
3. Update `lib/lajit.ts` — remove Lucide imports, add `labelEn`
4. Update `DiagonaalKortti.tsx` + `PaikkaKortti.tsx` (remove local duplicate)
5. Update `Etusivu.tsx` (CalloutCard + CombinedFilterPill icon usage)
6. `tsc --noEmit` + visual regression check

**Phase 2 — FI/EN i18n (after Phase 1):**
1. Install `next-intl`, create `messages/fi.json` + `messages/en.json`
2. Create `i18n/request.ts` + `actions/locale.ts`
3. Update `app/layout.tsx` (async + NextIntlClientProvider wrapper)
4. Wire NavBar first — validates full cookie → `router.refresh()` pipeline
5. Wire remaining components (PaikkaKortti, DiagonaalKortti, Etusivu, PaikkaSheet)
6. Verify: FI↔EN toggle works, hard reload preserves EN, map pins unaffected

## Open Questions
- SVG path extraction: zip contains 35 SVG files; paths need extracting for `SPORT_SVG_PATHS`
- `ReviewSection`/`ReviewForm` string audit — confirm count before finalizing `messages/fi.json`
- `lajiKonfig` `labelEn` decisions: confirm which sport names translate vs stay Finnish

---
*Research completed: 2026-06-03 | Ready for roadmap: yes*
