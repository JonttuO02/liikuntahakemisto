---
phase: 11-pwa
plan: "03"
subsystem: pwa-manifest-offline
tags: [pwa, manifest, viewport, offline-page, next14]
dependency_graph:
  requires:
    - phase: 11-01
      provides: public/icon-192x192.png and public/icon-512x512.png on disk
    - phase: 11-02
      provides: service worker with /offline fallback precache entry
  provides:
    - "app/manifest.ts — Web App Manifest at /manifest.webmanifest"
    - "app/layout.tsx — viewport themeColor + manifest metadata + mobile-web-app-capable"
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
    - "other: { mobile-web-app-capable: yes } — modern replacement for deprecated apple-mobile-web-app-capable"
key_files:
  created:
    - "app/manifest.ts — MetadataRoute.Manifest: name, short_name, display standalone, start_url /?nakyma=lista, theme_color #4F46E5, icons 192+512"
    - "app/offline/page.tsx — WifiOff glass card, Ei verkkoyhteyttä heading, Yritä uudelleen anchor to /?nakyma=lista"
  modified:
    - "app/layout.tsx — viewport export, manifest link, mobile-web-app-capable; appleWebApp.capable removed (deprecated)"
decisions:
  - "themeColor placed in viewport export (Viewport type), NOT metadata — prevents Next.js 14 build warning (RESEARCH.md Pitfall 1)"
  - "manifest field in metadata kept as explicit safety link even though Next.js file convention injects it automatically (RESEARCH.md Open Questions #2)"
  - "appleWebApp.capable: true removed post-checkpoint; replaced with other: { mobile-web-app-capable: yes } — browser deprecation fix"
  - "Offline page uses <a href> not Next.js <Link> — user is offline so SW must intercept a full document navigation to serve from cache"
  - "font-bold on offline page button (not font-semibold) — matches CLAUDE.md typography 2-weight rule"
metrics:
  duration: "~20 min"
  completed: "2026-05-27"
  tasks_completed: 3
  files_created: 2
  files_modified: 1
requirements-completed:
  - PWA-01
  - PWA-02
---

# Phase 11 Plan 03: Manifest + Layout + Offline Page Summary

**MetadataRoute.Manifest (standalone display, indigo theme, maskable 192+512 icons), viewport themeColor export, and Finnish glassmorphism offline fallback page — PWA installability and offline UX layer complete, build verified clean**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-27
- **Completed:** 2026-05-27
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `app/manifest.ts` exporting a Next.js `MetadataRoute.Manifest` object: name "Liikuntahakemisto", short_name "Liikunta", display "standalone", start_url "/?nakyma=lista", theme_color "#4F46E5", background_color "#ffffff", 192x192 maskable + 512x512 icons
- Updated `app/layout.tsx` with a `Viewport` export (`themeColor: '#4F46E5'`), manifest link, and `other: { 'mobile-web-app-capable': 'yes' }` — replacing the deprecated `appleWebApp.capable: true`
- Created `app/offline/page.tsx`: server component, glassmorphism card, WifiOff icon, Finnish heading "Ei verkkoyhteyttä.", retry anchor `href="/?nakyma=lista"` — served from SW precache when device is offline
- `npm run build` passed after all fixes: Serwist webpack plugin compiled `app/sw.ts` → `public/sw.js` (44 KB); `/manifest.webmanifest` and `/offline` routes confirmed static

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create app/manifest.ts — Web App Manifest | 8aa9c8a | app/manifest.ts (created) |
| 2 | Update app/layout.tsx — viewport export + manifest metadata | 3583bdd | app/layout.tsx |
| 3 | Create app/offline/page.tsx — offline fallback page | dd32c52 | app/offline/page.tsx (created) |
| post-checkpoint fix | Fix deprecated apple-mobile-web-app-capable meta | 27c7a89 | app/layout.tsx |

## What Was Built

### app/manifest.ts
Next.js 14 file convention — auto-served at `/manifest.webmanifest`. Fields:
- `name: "Liikuntahakemisto"`, `short_name: "Liikunta"`
- `display: "standalone"` — installed app looks native
- `start_url: "/?nakyma=lista"` — opens offline-capable listing view
- `theme_color: "#4F46E5"`, `background_color: "#ffffff"`
- `icons`: 192x192 (maskable) + 512x512

### app/layout.tsx
Additions after the post-checkpoint fix, all other code unchanged:
- `import type { Metadata, Viewport } from 'next'`
- `export const viewport: Viewport = { themeColor: '#4F46E5' }` — separate export, not in metadata
- `metadata.manifest = '/manifest.webmanifest'`
- `metadata.appleWebApp = { statusBarStyle: 'default' }` — `capable: true` removed (deprecated)
- `metadata.other = { 'mobile-web-app-capable': 'yes' }` — modern equivalent, no browser warning

### app/offline/page.tsx
Server component, no client JS. Matches not-found.tsx structure exactly:
- glassmorphism `glass` card with WifiOff icon
- Heading: "Ei verkkoyhteyttä." (font-serif font-bold)
- Body: "Tarkista verkkoyhteys ja yritä uudelleen."
- CTA: `<a href="/?nakyma=lista">Yritä uudelleen</a>` — full navigation for SW cache intercept

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Replaced deprecated `appleWebApp.capable: true` with `mobile-web-app-capable`**
- **Found during:** Post-checkpoint build verification
- **Issue:** The plan specified `appleWebApp: { capable: true, statusBarStyle: 'default' }`. The `apple-mobile-web-app-capable` meta tag is deprecated in modern browsers. Using `appleWebApp.capable: true` generates a browser deprecation warning in production; the correct modern equivalent is `other: { 'mobile-web-app-capable': 'yes' }`.
- **Fix:** Removed `capable: true` from `appleWebApp` (keeping `statusBarStyle: 'default'`); added `other: { 'mobile-web-app-capable': 'yes' }` to the metadata export
- **Files modified:** `app/layout.tsx`
- **Verification:** Build passed without deprecation warning; `npm run build` output confirmed `✓ Compiled successfully`
- **Committed in:** 27c7a89 (post-checkpoint fix)

---

**Total deviations:** 1 auto-fixed (Rule 2 — correctness fix for browser deprecation)
**Impact on plan:** Single targeted change to `app/layout.tsx`; no scope creep; build now clean.

## Build Verification

`npm run build` output after all fixes:

```
✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'
✓ Compiled successfully
Route (app):
  /manifest.webmanifest  Static
  /offline               Static  838 B
public/sw.js generated  44 KB
```

## Known Stubs

None. All files deliver functional PWA infrastructure:
- manifest.ts uses real icons from Plan 01 (placeholder artwork, but not stub code)
- offline/page.tsx contains final Finnish copy as specified in D-14
- layout.tsx changes are complete and non-conditional

## Threat Mitigations Applied

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-11-11 | themeColor in viewport export, not metadata — prevents deprecated tag behavior |
| T-11-10 | appleWebApp.capable removed; mobile-web-app-capable used instead — no new privilege surface |
| T-11-08 | /offline page is static server component — no user data, no auth state |
| T-11-09 | manifest start_url = /?nakyma=lista — publicly accessible, no auth gate |

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- app/manifest.ts: EXISTS — MetadataRoute.Manifest, standalone, icon-192x192, icon-512x512, #4F46E5, nakyma=lista
- app/layout.tsx: EXISTS — Viewport, export const viewport, themeColor, #4F46E5, manifest.webmanifest, mobile-web-app-capable
- app/offline/page.tsx: EXISTS — WifiOff, glass, Ei verkkoyhteyttä, nakyma=lista, font-serif, font-bold; no use client; no font-semibold
- Commit 8aa9c8a: FOUND (manifest.ts)
- Commit 3583bdd: FOUND (layout.tsx)
- Commit dd32c52: FOUND (offline/page.tsx)
- Commit 27c7a89: FOUND (post-checkpoint deprecation fix)

## Next Phase Readiness

Phase 11 (PWA) is complete — all 3 plans done:
- Plan 01: Icons + Serwist packages
- Plan 02: Service worker + next.config.mjs
- Plan 03: Manifest + viewport + offline page

The app is now installable (PWA-02) and shows a custom offline page for uncached routes (PWA-01). The v1.1 milestone (Phases 6–11) is fully complete.

---
*Phase: 11-pwa*
*Completed: 2026-05-27*
