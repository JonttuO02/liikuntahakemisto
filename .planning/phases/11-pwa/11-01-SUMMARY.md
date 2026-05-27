---
phase: 11-pwa
plan: "01"
subsystem: pwa
tags: [pwa, serwist, icons, npm-install]
dependency_graph:
  requires: []
  provides:
    - "@serwist/next@9.5.11 in dependencies"
    - "serwist@9.5.11 in dependencies"
    - "pureimage@0.4.18 in devDependencies"
    - "public/icon-192x192.png"
    - "public/icon-512x512.png"
    - "scripts/generate-pwa-icons.mjs"
  affects:
    - "package.json"
    - "package-lock.json"
tech_stack:
  added:
    - "@serwist/next@9.5.11 — Serwist Next.js adapter (withSerwist webpack plugin)"
    - "serwist@9.5.11 — Core service worker runtime (NetworkFirst, CacheFirst, ExpirationPlugin)"
    - "pureimage@0.4.18 — Pure-JS PNG generation (devDep, icon script only)"
  patterns:
    - "ESM .mjs script with import.meta.url for __dirname emulation"
    - "pureimage PImage.make + encodePNGToStream for programmatic PNG generation"
key_files:
  created:
    - "scripts/generate-pwa-icons.mjs — Icon generation script (indigo #4F46E5, 192 and 512 sizes)"
    - "public/icon-192x192.png — 192x192 placeholder PWA icon (555 bytes)"
    - "public/icon-512x512.png — 512x512 placeholder PWA icon (1955 bytes)"
    - "public/ — directory created (did not exist previously)"
  modified:
    - "package.json — added @serwist/next, serwist, pureimage"
    - "package-lock.json — updated with new packages"
decisions:
  - "pureimage chosen over canvas/sharp to avoid native system library dependencies (Cairo/libvips)"
  - "Icon color #4F46E5 (indigo-600) matches manifest theme_color per D-17"
  - "Icons are explicit placeholders — real brand icons deferred until name/logo decided (D-15)"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
requirements:
  - PWA-02
---

# Phase 11 Plan 01: Serwist Install + PWA Icons Summary

Serwist-paketit (@serwist/next + serwist 9.5.11) asennettu, pureimage devDependencyna, ja indigo #4F46E5 placeholder-ikonit generoitu kahdessa koossa (192x192, 512x512) scripts/generate-pwa-icons.mjs-skriptin avulla.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Serwist packages and pureimage | f31ea08 | package.json, package-lock.json |
| 2 | Create icon generation script and run it | 35f830e | scripts/generate-pwa-icons.mjs, public/icon-192x192.png, public/icon-512x512.png |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing public/ directory**
- **Found during:** Task 2
- **Issue:** The `public/` directory did not exist in the repository. Running `node scripts/generate-pwa-icons.mjs` failed with `ENOENT: no such file or directory` when trying to open `public/icon-192x192.png`.
- **Fix:** Created the `public/` directory with `mkdir -p` before re-running the script.
- **Files modified:** public/ (directory created)
- **Commit:** 35f830e (included in same task commit)

## Verification Results

All 5 plan verification steps passed:

1. `@serwist/next: "^9.5.11"` — present in package.json dependencies
2. `serwist: "^9.5.11"` — present in package.json dependencies
3. `pureimage: "^0.4.18"` — present in package.json devDependencies
4. `node scripts/generate-pwa-icons.mjs` — re-runs cleanly, regenerates both files
5. Icon sizes: icon-192x192.png = 555 bytes, icon-512x512.png = 1955 bytes (both > 100 bytes)

## Known Stubs

None. This plan delivers self-contained build artifacts (package installs and icon files). No UI components, no data stubs, no placeholder text.

## Threat Flags

None. Package installs passed Package Legitimacy Audit (all three packages have slopcheck [OK] per RESEARCH.md). The icon generation script performs local file writes only — no network calls, no postinstall hooks, no eval.

## Self-Check: PASSED

- scripts/generate-pwa-icons.mjs: EXISTS
- public/icon-192x192.png: EXISTS (555 bytes)
- public/icon-512x512.png: EXISTS (1955 bytes)
- package.json @serwist/next: ^9.5.11
- package.json serwist: ^9.5.11
- package.json pureimage: ^0.4.18
- Task 1 commit f31ea08: FOUND
- Task 2 commit 35f830e: FOUND
