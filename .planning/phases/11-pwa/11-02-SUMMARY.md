---
phase: 11-pwa
plan: "02"
subsystem: pwa-service-worker
tags: [pwa, serwist, service-worker, caching, offline]
dependency_graph:
  requires: [11-01]
  provides: [service-worker-source, withSerwist-config]
  affects: [next.config.mjs, tsconfig.json, .gitignore]
tech_stack:
  added: []
  patterns: [NetworkFirst, StaleWhileRevalidate, ExpirationPlugin, withSerwist-wrapper]
key_files:
  created:
    - app/sw.ts
  modified:
    - next.config.mjs
    - tsconfig.json
    - .gitignore
decisions:
  - "ignoreURLParametersMatching: [/^_rsc$/] strips RSC param before precache lookup (D-03)"
  - "disable: process.env.NODE_ENV === 'development' prevents dev cache poisoning (D-02)"
  - "/api/ excluded from all runtime caching matchers — Supabase auth cookies flow unimpeded"
  - "NetworkFirst with 24h TTL for /?nakyma=lista document requests (D-06, D-07)"
  - "RSC prefetch and navigation use StaleWhileRevalidate (pages-rsc-prefetch, pages-rsc caches)"
  - "/offline in additionalPrecacheEntries — always available for offline fallback (D-13)"
metrics:
  duration: "~15 min"
  completed: "2026-05-27"
  tasks_completed: 2
  files_created: 1
  files_modified: 3
---

# Phase 11 Plan 02: Service Worker Configuration Summary

**One-liner:** Serwist service worker (app/sw.ts) + withSerwist wrapper in next.config.mjs: RSC strategies, NetworkFirst listing-page cache, /api/ exclusion, /offline fallback, _rsc ignoreURLParametersMatching.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create app/sw.ts — complete service worker | fe7b29c | app/sw.ts (created) |
| 2 | Update next.config.mjs, tsconfig.json, .gitignore | d8e8dcc | next.config.mjs, tsconfig.json, .gitignore |

## What Was Built

### app/sw.ts
Service worker source compiled by the withSerwist webpack plugin to `public/sw.js`. Contains:

- **RSC prefetch strategy** (Entry 1): `StaleWhileRevalidate`, cache `pages-rsc-prefetch`, triggers on `RSC: 1` + `Next-Router-Prefetch: 1` headers, sameOrigin, excludes `/api/`
- **RSC navigation strategy** (Entry 2): `StaleWhileRevalidate`, cache `pages-rsc`, triggers on `RSC: 1` header, sameOrigin, excludes `/api/`
- **Listing page strategy** (Entry 3): `NetworkFirst`, cache `listing-page`, 10s timeout, 24h TTL — matches `url.pathname === "/"` AND `url.searchParams.get("nakyma") === "lista"`
- **Serwist constructor**: `precacheEntries: self.__SW_MANIFEST`, `ignoreURLParametersMatching: [/^_rsc$/]`, `cleanupOutdatedCaches: true`, `skipWaiting: true`, `clientsClaim: true`, `navigationPreload: true`
- **Fallback**: `fallbacks.entries[0].url = "/offline"` — serves precached /offline for all uncached document requests offline
- **Event listeners**: `serwist.addEventListeners()` at bottom

### next.config.mjs
Replaced empty config with withSerwistInit wrapper:
- `swSrc: "app/sw.ts"`, `swDest: "public/sw.js"`
- `disable: process.env.NODE_ENV === "development"` (D-02 — prevents dev cache poisoning)
- `reloadOnOnline: false` (prevents forced reload discarding user state on reconnect)
- `additionalPrecacheEntries: [{ url: "/offline", revision }]` (D-13 — /offline always precached)
- `revision` computed from `git rev-parse HEAD` with `crypto.randomUUID()` fallback

### tsconfig.json
- Added `"webworker"` to `compilerOptions.lib` — exposes `ServiceWorkerGlobalScope`, `self`, SW fetch event types to app/sw.ts
- Added `"types": ["@serwist/next/typings"]` — exposes `__SW_MANIFEST` type injection
- Added `"public/sw.js"` to `exclude` — prevents TypeScript from type-checking the compiled SW output

### .gitignore
Added Serwist build artifacts section:
- `public/sw.js` — webpack compiled SW output
- `public/sw.js.map` — source map
- `public/swe-worker*` — Serwist worker chunks

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-11-03 | `/api/` excluded from all 3 runtimeCaching matchers in customStrategies |
| T-11-05 | `skipWaiting + clientsClaim + cleanupOutdatedCaches` activates new SW immediately; 24h TTL |
| T-11-06 | `disable: process.env.NODE_ENV === "development"` prevents SW in dev |
| T-11-07 | `precacheOptions.ignoreURLParametersMatching: [/^_rsc$/]` strips _rsc param |

## Known Stubs

None — this plan creates caching infrastructure only. No data sources or UI components.

## Threat Flags

No new security-relevant surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

- app/sw.ts: FOUND
- next.config.mjs: FOUND (withSerwist wrapper, disable in dev, /offline entry)
- tsconfig.json: FOUND (webworker, @serwist/next/typings, public/sw.js excluded)
- .gitignore: FOUND (public/sw.js, public/sw.js.map, public/swe-worker*)
- Commit fe7b29c: FOUND
- Commit d8e8dcc: FOUND
