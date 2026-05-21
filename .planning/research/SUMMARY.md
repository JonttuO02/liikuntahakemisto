# Research Summary — Liikuntahakemisto v1.1

## Executive Summary

Liikuntahakemisto v1.1 adds five capability groups to a working v1.0 MVP: auth with favorites, map infrastructure improvements, multi-city expansion, PWA installability, and UI/data polish. The codebase requires only **3 new npm packages**: `@supabase/ssr`, `@serwist/next`, and `serwist`. All other v1.1 features (clustering, GPS accuracy ring, city expansion, Sponsoroitu badge) are implementable with packages already installed.

## Stack Additions

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/ssr` | ^0.10.3 | Cookie-based session management for App Router auth — mandatory |
| `@serwist/next` | ^9.0.0 | Next.js PWA plugin (both `next-pwa` and `@ducanh2912/next-pwa` are abandoned) |
| `serwist` | ^9.0.0 | Service worker toolbox used by @serwist/next |

**Already installed, no action needed:**
- `@googlemaps/markerclusterer ^2.6.2` — clustering
- `@vis.gl/react-google-maps` `<Circle>` — GPS accuracy ring

## Feature Table Stakes vs Differentiators

**Table stakes (must ship):**
- LEGAL-01: GDPR page (legally mandatory before auth ships)
- AUTH-01/02: email + Google OAuth + favorites in Supabase
- MAP-04: re-center button
- MAP-05: GPS accuracy ring
- MAP-07: in-app map focus (replacing Google Maps link)
- UI-05–08: card polish + filter dropdown
- DATA-05/06/07: Helsinki + Turku + kaupunki column
- PWA-01/02: installable + offline

**Differentiators (ship if capacity):**
- MAP-06: zoom-dependent clustering → info cards
- AUTH-03: personalized AI from favorites
- ADS-02: Sponsoroitu badge
- AI-04: city name in AI widget

**Explicit anti-features (never build):**
- Anonymous Supabase accounts (session upgrade complexity not worth it)
- Multi-select sport filter
- Forced login gate on any non-favorites page
- Push notifications
- Immediate PWA install prompt on page load

## Key Architectural Decisions

- **Supabase Auth uses per-request `createServerClient`** — never the existing module-scope singleton after auth is added
- **`middleware.ts` is mandatory** — without it sessions expire silently after ~1 hour
- **AdvancedMarker migration is a prerequisite** for clustering, accuracy ring, and map focus — both `<Map>` instances need `mapId`
- **Auth must not block SSR** — public listing page is anonymous; auth-specific UI loads client-side via `AuthProvider`
- **`supabase.auth.getUser()` server-side** — never `getSession()` (reads unvalidated cookie)
- **Map focus URL:** `/?nakyma=kartta&id=<paikka_id>` — full `<Link>` navigation

## Critical Pitfalls

1. **Supabase singleton session leakage** — existing `lib/supabase.ts` singleton leaks sessions; replace with per-request `createServerClient` for all auth-aware operations
2. **Missing middleware.ts** — this file does not exist yet; must be first deliverable of auth phase
3. **mapId required for AdvancedMarker** — without `mapId` on both `<Map>` instances, all markers silently disappear; add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` env var before any AdvancedMarker work
4. **sync-paikat hardcodes Tampere** — upsert overwrites `kaupunki` with `'Tampere'` on every sync; fix before running any Helsinki/Turku sync
5. **Service worker intercepts RSC requests** — breaks client-side navigation post-deploy; use Serwist, exclude `_rsc` requests, disable SW in dev
6. **RLS INSERT needs `WITH CHECK` not `USING`** — `USING` on INSERT does not enforce at write time; any authenticated user could write to another's favorites

## Recommended Phase Order

| Phase | Focus | Key features | Risk |
|-------|-------|-------------|------|
| 1 | Zero-dep UI & data foundation | LEGAL-01, ADS-02, AI-04, UI-05–08, DATA-07 UI | Low |
| 2 | Map infrastructure | AdvancedMarker migration, MAP-04 re-center | Medium |
| 3 | Map features | MAP-05 accuracy ring, MAP-06 clustering, MAP-07 focus | Medium |
| 4 | Auth + favorites | AUTH-01–03, middleware.ts, suosikit RLS | High |
| 5 | PWA (last) | PWA-01/02, service worker, manifest | Medium |

**Ordering rationale:** GDPR legally precedes auth. AdvancedMarker migration is a discrete prerequisite for all map features. Auth mid-milestone when codebase is stable and understood. PWA last — needs complete API surface for caching strategy.

## Open Questions

- **mapId:** Add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` env var — requires creating a Map ID in Google Cloud Console before Phase 2
- **`kaupunki` column:** Verify it exists in live Supabase DB (it's in `lib/types.ts` but may not be in the actual schema yet)
- **Zoom threshold for clustering:** Start at zoom 14 (matches existing fullscreen default), tunable empirically
- **PWA icons:** `public/icon-192x192.png` and `public/icon-512x512.png` need to be generated from existing `acta-symbol.svg`
- **AUTH-03 token budget:** Max favorites count to include in Claude Haiku prompt needs a decision (suggest 5–10)
- **Google OAuth:** Requires Google Cloud Console callback URL + Supabase dashboard redirect URL — external config before Phase 4
- **Serwist requires webpack:** Confirm `next dev` (not `--turbo`) is the standard before Phase 5

---

*Generated: 2026-05-21 | Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
