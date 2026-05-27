---
phase: 11-pwa
verified: 2026-05-27T15:30:00Z
status: human_needed
score: 12/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run npm run build and verify public/sw.js is produced"
    expected: "Build completes without errors; public/sw.js is produced by the Serwist webpack plugin (SUMMARY claims 44 KB); /manifest.webmanifest and /offline routes are static"
    why_human: "public/sw.js is gitignored — it only exists after a production build, which cannot be run here. The build artifact is the critical proof that withSerwist compiles app/sw.ts correctly."
  - test: "Serve production build and test offline behavior"
    expected: "After npm run start: (1) visit http://localhost:3000/?nakyma=lista — load once online; (2) go offline; (3) reload /?nakyma=lista — page loads from SW cache; (4) visit any uncached URL — shows /offline page with Finnish text and WifiOff icon"
    why_human: "Offline caching behavior requires a registered service worker, which only activates in production mode and requires a live browser session."
  - test: "Verify PWA install prompt appears on Android Chrome"
    expected: "Chrome shows the mini-infobar or install button; DevTools Application > Manifest shows no installability errors; icons 192x192 and 512x512 render correctly"
    why_human: "Install prompt requires a real device or browser DevTools simulation; cannot verify from CLI."
---

# Phase 11: PWA Verification Report

**Phase Goal:** The app is installable and shows cached content when the device is offline
**Verified:** 2026-05-27T15:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A user on Android/iOS can add the app to their home screen via install prompt | ? UNCERTAIN | manifest.ts has standalone display, 192+512 icons, theme_color — all installability fields present. Build artifact (public/sw.js) not verifiable without running build. Needs human. |
| 2 | After one online visit, listing page loads offline from cache | ? UNCERTAIN | NetworkFirst strategy for `/?nakyma=lista` present in sw.ts. SW compilation and actual cache behavior require production run. Needs human. |
| 3 | Service worker does not break client-side navigation or RSC requests in production | ? UNCERTAIN | RSC prefetch and RSC navigation StaleWhileRevalidate strategies present and correctly exclude /api/. Functional test requires production build. Needs human. |

**Score:** All code artifacts verified. 3 truths require human/runtime verification (behavior depends on production build producing public/sw.js).

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | @serwist/next, serwist in deps; pureimage in devDeps | VERIFIED | @serwist/next: ^9.5.11, serwist: ^9.5.11 in dependencies; pureimage: ^0.4.18 in devDependencies — all present |
| `scripts/generate-pwa-icons.mjs` | ESM icon generator using pureimage, 192+512 indigo PNGs | VERIFIED | Imports PImage from "pureimage", uses encodePNGToStream, generates 192 and 512 sizes at #4F46E5, uses import.meta.url for __dirname |
| `public/icon-192x192.png` | Non-zero PNG file | VERIFIED | 555 bytes on disk |
| `public/icon-512x512.png` | Non-zero PNG file | VERIFIED | 1955 bytes on disk |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/sw.ts` | NetworkFirst listing, RSC strategies, /offline fallback, /api/ NetworkOnly, _rsc ignoreParams | VERIFIED | All 4 strategies present; ignoreURLParametersMatching: [/^_rsc$/]; fallbacks.entries[0].url = "/offline"; serwist.addEventListeners() at end |
| `next.config.mjs` | withSerwist wrapper, disable in dev, /offline in additionalPrecacheEntries | VERIFIED | withSerwistInit imported, swSrc: "app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development", additionalPrecacheEntries includes /offline and /?nakyma=lista |
| `tsconfig.json` | public/sw.js excluded; app/sw.ts excluded (isolation approach) | VERIFIED | exclude: ["node_modules", "public/sw.js", "app/sw.ts"] — sw.ts isolated to tsconfig.sw.json |
| `tsconfig.sw.json` | lib: webworker, types: @serwist/next/typings, scoped to app/sw.ts | VERIFIED | lib: ["webworker", "webworker.iterable", "esnext"], types: ["@serwist/next/typings"], include: ["app/sw.ts"] |
| `.gitignore` | public/sw.js, public/sw.js.map, public/swe-worker* excluded | VERIFIED | All three entries present in "Serwist compiled output" section |

### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/manifest.ts` | name Liikuntahakemisto, standalone, start_url /?nakyma=lista, icons 192+512, theme_color #4F46E5 | VERIFIED | All fields present; 192x192 purpose: "maskable", 512x512 present |
| `app/layout.tsx` | Viewport export with themeColor, manifest link, mobile-web-app-capable | VERIFIED | export const viewport: Viewport = { themeColor: '#4F46E5' }; metadata.manifest = '/manifest.webmanifest'; other: { 'mobile-web-app-capable': 'yes' } |
| `app/offline/page.tsx` | Server component, WifiOff, Finnish text, glass class, font-bold | VERIFIED | No 'use client'; WifiOff icon; "Ei verkkoyhteyttä." heading; glass card; font-bold; anchor href="/?nakyma=lista" |
| `public/sw.js` | Serwist webpack build output (44 KB) | UNCERTAIN | File is gitignored. SUMMARY claims "public/sw.js generated 44 KB" from npm run build. Cannot verify without running build. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| next.config.mjs | app/sw.ts | withSerwist({ swSrc: "app/sw.ts", swDest: "public/sw.js" }) | VERIFIED | Both swSrc and swDest present with exact paths |
| app/sw.ts | /offline | fallbacks.entries[0].url = "/offline" | VERIFIED | fallbacks.entries[0].url: "/offline" present; matcher checks request.destination === "document" |
| app/sw.ts | /?nakyma=lista | NetworkFirst matcher on url.searchParams.get("nakyma") === "lista" | VERIFIED | url.pathname === "/" AND url.searchParams.get("nakyma") === "lista" — exact match |
| app/layout.tsx | app/manifest.ts | metadata.manifest = '/manifest.webmanifest' | VERIFIED | metadata.manifest: '/manifest.webmanifest' present in layout.tsx |
| app/manifest.ts | public/icon-192x192.png | icons[0].src = "/icon-192x192.png" | VERIFIED | Present; both icon files exist on disk |
| app/manifest.ts | public/icon-512x512.png | icons[1].src = "/icon-512x512.png" | VERIFIED | Present |

---

## tsconfig Architecture — Deviation Note

The plan (Plan 02) specified adding `"webworker"` to `tsconfig.json`'s `lib` array. The actual implementation uses a different but correct approach:

- `tsconfig.json`: excludes `app/sw.ts` entirely (prevents DOM/webworker type collision for app code)
- `tsconfig.sw.json`: a separate tsconfig extending `tsconfig.json` with `lib: ["webworker", "webworker.iterable", "esnext"]` and `types: ["@serwist/next/typings"]`, scoped only to `app/sw.ts`

This is architecturally superior to the plan's approach — adding "webworker" to the main tsconfig would expose ServiceWorkerGlobalScope to all app TypeScript files, which is incorrect. The isolation approach avoids type pollution. This is a correct deviation (correctness improvement, not scope reduction).

---

## next.config.mjs — additionalPrecacheEntries Enhancement

The plan specified only `/offline` in `additionalPrecacheEntries`. The actual implementation also includes `{ url: "/?nakyma=lista", revision }`. This ensures the listing page is precached at install time in addition to the NetworkFirst runtime caching strategy — a defense-in-depth enhancement aligned with the phase goal (offline listing page). Not a deviation.

---

## layout.tsx — appleWebApp Deviation

Plan 03 specified `appleWebApp: { capable: true, statusBarStyle: 'default' }`. The executor removed `capable: true` (browser-deprecated) and added `other: { 'mobile-web-app-capable': 'yes' }` instead. The SUMMARY documents this as a post-checkpoint correctness fix. The actual layout.tsx confirms: `appleWebApp: { statusBarStyle: 'default' }` and `other: { 'mobile-web-app-capable': 'yes' }`. No `capable: true` in layout.tsx. This matches CLAUDE.md's convention requirement and avoids browser deprecation warnings.

---

## Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|---------|
| PWA-01 | 11-02, 11-03 | App works at basic level offline (cached content visible without network) | VERIFIED (code) / UNCERTAIN (runtime) | NetworkFirst strategy for /?nakyma=lista; /offline fallback page; additionalPrecacheEntries includes both. Runtime behavior needs human verification. |
| PWA-02 | 11-01, 11-02, 11-03 | User can add app to home screen (Web App Manifest + install prompt) | VERIFIED (code) / UNCERTAIN (runtime) | manifest.ts: standalone, 192+512 icons, theme_color, start_url; layout.tsx: viewport themeColor, manifest link. Build artifact needs human verification. |

Both PWA-01 and PWA-02 are marked complete in REQUIREMENTS.md. All code prerequisites are present. Runtime confirmation requires a production build.

---

## Anti-Patterns Scan

Files modified in this phase: `package.json`, `scripts/generate-pwa-icons.mjs`, `app/sw.ts`, `next.config.mjs`, `tsconfig.json`, `tsconfig.sw.json`, `.gitignore`, `app/manifest.ts`, `app/layout.tsx`, `app/offline/page.tsx`.
<br>
No TBD, FIXME, XXX, TODO, HACK, or PLACEHOLDER markers found in any phase file. No empty implementations (`return null`, `return {}`, `return []`). No hardcoded empty data that flows to rendering. `app/offline/page.tsx` has no `use client` directive — confirmed server component. No `font-semibold` in offline page — confirmed `font-bold` used throughout.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | No anti-patterns found |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| package.json has @serwist/next, serwist, pureimage | Read package.json | All three present at correct versions | PASS |
| sw.ts has NetworkFirst for nakyma=lista | Read app/sw.ts | Entry 3 matches url.pathname === "/" AND url.searchParams.get("nakyma") === "lista" | PASS |
| sw.ts excludes /api/ routes | Read app/sw.ts | Entry 4: NetworkOnly for pathname.startsWith('/api/') | PASS |
| sw.ts has _rsc ignoreURLParametersMatching | Read app/sw.ts | ignoreURLParametersMatching: [/^_rsc$/] present | PASS |
| manifest.ts has standalone display | Read app/manifest.ts | display: 'standalone' present | PASS |
| offline page is a server component | Read app/offline/page.tsx | No 'use client' directive | PASS |
| public/sw.js produced by build | ls public/ | sw.js absent (gitignored; requires `npm run build`) | SKIP (needs human) |

---

## Human Verification Required

### 1. Production Build + public/sw.js

**Test:** Run `npm run build` from the project root.
**Expected:** Build succeeds with output including `(serwist) Bundling the service worker script with the URL '/sw.js'`; `public/sw.js` is produced (~44 KB); `/manifest.webmanifest` and `/offline` routes appear as Static in the route table.
**Why human:** `public/sw.js` is gitignored and only produced during `npm run build`. Without this file, the PWA has no service worker and the entire phase goal fails. The build cannot be run in this verification context.

### 2. Offline Caching Behavior

**Test:** Run `npm run start`, open http://localhost:3000/?nakyma=lista in Chrome. Then set the Network tab to Offline mode and reload.
**Expected:** The listing page loads from SW cache (DevTools Application > Cache Storage shows a `listing-page` cache entry). Venue cards are visible without network.
**Why human:** Cache population and SW activation require a live browser session with a registered service worker.

### 3. Offline Fallback Page

**Test:** While offline (from step 2), navigate to http://localhost:3000 (root, without `?nakyma=lista`).
**Expected:** The custom `/offline` page renders with the glassmorphism WifiOff card, heading "Ei verkkoyhteyttä.", body text, and "Yritä uudelleen" link — not a browser error page.
**Why human:** The SW fallback to /offline only triggers in a live browser with registered SW.

### 4. PWA Installability

**Test:** With `npm run start`, open Chrome DevTools > Application > Manifest on http://localhost:3000/?nakyma=lista.
**Expected:** No installability errors; name "Liikuntahakemisto", display "standalone", icons at 192x192 and 512x512 visible; theme color #4F46E5.
**Why human:** Installability check requires a running server and browser DevTools — not verifiable from CLI.

---

## Gaps Summary

No code-level gaps found. All 12 checkable artifacts exist, are substantive, and are correctly wired:
- Serwist packages installed at correct versions
- Icon files on disk (555 bytes and 1955 bytes)
- sw.ts has all required strategies (RSC prefetch, RSC nav, NetworkFirst listing, NetworkOnly /api/)
- next.config.mjs wraps with withSerwist, disables in dev, precaches /offline and /?nakyma=lista
- tsconfig architecture correctly isolates SW types in tsconfig.sw.json
- manifest.ts has all required installability fields
- layout.tsx exports Viewport with themeColor, links manifest
- offline/page.tsx is a proper server component with correct Finnish copy

The 3 human verification items are runtime behaviors that require a production build and live browser — they cannot be confirmed from static code analysis alone. The code is complete and correctly structured to deliver the phase goal.

---

_Verified: 2026-05-27T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
