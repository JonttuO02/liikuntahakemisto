---
phase: 11-pwa
plan: "03"
subsystem: pwa-manifest-offline
tags: [pwa, manifest, viewport, offline-page, next14]
dependency_graph:
  requires: [11-01, 11-02]
  provides:
    - "app/manifest.ts — Web App Manifest at /manifest.webmanifest"
    - "app/layout.tsx — viewport themeColor + manifest metadata + appleWebApp"
    - "app/offline/page.tsx — Finnish offline fallback page (server component)"
  affects:
    - app/manifest.ts
    - app/layout.tsx
    - app/offline/page.tsx
tech_stack:
  added: []
  patterns:
    - "Next.js 14 MetadataRoute.Manifest file convention (auto-serves /manifest.webmanifest)"
    - "Separate viewport export (Viewport type) for themeColor — avoids deprecated metadata.themeColor"
    - "Server component offline page — no JS, precacheable, SW-interceptable"
key_files:
  created:
    - "app/manifest.ts — MetadataRoute.Manifest: name, short_name, display standalone, start_url /?nakyma=lista, theme_color #4F46E5, icons 192+512"
    - "app/offline/page.tsx — WifiOff glass card, Ei verkkoyhteyttä heading, Yritä uudelleen anchor to /?nakyma=lista"
  modified:
    - "app/layout.tsx — added Viewport import, viewport export, manifest + appleWebApp metadata fields"
decisions:
  - "themeColor placed in viewport export (Viewport type), NOT metadata — prevents Next.js 14 build warning (RESEARCH.md Pitfall 1)"
  - "manifest field in metadata kept as explicit safety link even though Next.js file convention injects it automatically (RESEARCH.md Open Questions #2)"
  - "appleWebApp: { capable: true, statusBarStyle: default } — enables iOS A2HS fullscreen with no downside (RESEARCH.md Open Questions #3)"
  - "Offline page uses <a href> not Next.js <Link> — user is offline so SW must intercept a full document navigation to serve from cache"
  - "font-bold on offline page button (not font-semibold) — matches CLAUDE.md typography 2-weight rule"
metrics:
  duration: "~1 minute"
  completed: "2026-05-27"
  tasks_completed: 3
  tasks_total: 4
  files_created: 2
  files_modified: 1
requirements:
  - PWA-01
  - PWA-02
---

# Phase 11 Plan 03: Manifest + Layout + Offline Page Summary

Web App Manifest (app/manifest.ts), layout.tsx viewport/manifest metadata, ja suomenkielinen offline-sivu (app/offline/page.tsx) luotu — PWA on nyt asennettavissa ja offline-käyttö toimii /offline-fallbackin kautta.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create app/manifest.ts — Web App Manifest | 8aa9c8a | app/manifest.ts (created) |
| 2 | Update app/layout.tsx — viewport export + manifest metadata | 3583bdd | app/layout.tsx |
| 3 | Create app/offline/page.tsx — offline fallback page | dd32c52 | app/offline/page.tsx (created) |
| 4 | Human checkpoint — awaiting verification | — | — |

## What Was Built

### app/manifest.ts
Next.js 14 file convention — auto-served at `/manifest.webmanifest`. Fields:
- `name: "Liikuntahakemisto"`, `short_name: "Liikunta"`
- `display: "standalone"` — installed app looks native
- `start_url: "/?nakyma=lista"` — opens offline-capable listing view
- `theme_color: "#4F46E5"`, `background_color: "#ffffff"`
- `icons`: 192x192 (maskable) + 512x512

### app/layout.tsx
Three additions, all other code unchanged:
- `import type { Metadata, Viewport } from 'next'`
- `export const viewport: Viewport = { themeColor: '#4F46E5' }` — separate export, not in metadata
- `metadata.manifest = '/manifest.webmanifest'`
- `metadata.appleWebApp = { capable: true, statusBarStyle: 'default' }`

### app/offline/page.tsx
Server component, no client JS. Matches not-found.tsx structure exactly:
- glassmorphism `glass` card with WifiOff icon
- Heading: "Ei verkkoyhteyttä." (font-serif font-bold)
- Body: "Tarkista verkkoyhteys ja yritä uudelleen."
- CTA: `<a href="/?nakyma=lista">Yritä uudelleen</a>` — full navigation for SW cache intercept

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All files deliver functional PWA infrastructure:
- manifest.ts uses real icons from Plan 01 (placeholder artwork, but not stub code)
- offline/page.tsx contains final Finnish copy as specified in D-14
- layout.tsx changes are complete and non-conditional

## Threat Mitigations Applied

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-11-11 | themeColor in viewport export, not metadata — prevents deprecated tag behavior |
| T-11-10 | appleWebApp: capable: true — documented as accepted risk, no privilege change |
| T-11-08 | /offline page is static server component — no user data, no auth state |
| T-11-09 | manifest start_url = /?nakyma=lista — publicly accessible, no auth gate |

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- app/manifest.ts: EXISTS — MetadataRoute.Manifest, standalone, icon-192x192, icon-512x512, #4F46E5, nakyma=lista
- app/layout.tsx: EXISTS — Viewport, export const viewport, themeColor, #4F46E5, manifest.webmanifest, appleWebApp
- app/offline/page.tsx: EXISTS — WifiOff, glass, Ei verkkoyhteyttä, nakyma=lista, font-serif, font-bold; no use client; no font-semibold
- Commit 8aa9c8a: FOUND (manifest.ts)
- Commit 3583bdd: FOUND (layout.tsx)
- Commit dd32c52: FOUND (offline/page.tsx)
