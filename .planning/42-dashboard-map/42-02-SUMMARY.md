---
phase: 42
plan: "02"
subsystem: business-map
tags: [map, business, routing, i18n, google-maps]
dependency_graph:
  requires: [42-01]
  provides: [/business/map route]
  affects: [messages/fi.json, messages/en.json]
tech_stack:
  added: []
  patterns: [@vis.gl/react-google-maps AdvancedMarker, dual Supabase clients (anon + biz session), SportPin scale-wrapper for selected state]
key_files:
  created: [app/business/map/page.tsx]
  modified: [messages/fi.json, messages/en.json]
decisions:
  - MapProvider wrapped at page level (not in business layout) — only map page needs APIProvider
  - SportPin selected state via wrapper div scale transform — no SportPin prop changes needed
  - PaikkaSheet bookmark mutations suppressed (todo=false, no-op onToggleTodo)
  - Dual Supabase clients: createBrowserSupabase (anon) for public venues, createBusinessBrowserClient (biz session) for owned venue IDs
metrics:
  duration: "~15 min"
  completed: "2026-06-12T13:10:51Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 42 Plan 02: /business/map Route Summary

Full-screen business map at `/business/map` with SportPin markers, Kaikki/Omat toggle pill, PaikkaSheet on pin tap, and GPS re-center button — using dual Supabase clients for public venue data and business-session-filtered own venues.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add i18n keys | ef2bdf8 | messages/fi.json, messages/en.json |
| 2 | Create app/business/map/page.tsx | 607e3da | app/business/map/page.tsx |
| 3 | SportPin note (no changes needed) | — | — |

## What Was Built

### Task 1 — i18n keys
Added 3 keys to the `Business` namespace in both `messages/fi.json` and `messages/en.json`:
- `mapToggleAll` — "Kaikki paikat" / "All venues"
- `mapToggleMine` — "Omat paikat" / "My venues"
- `mapLoadingVenues` — "Ladataan paikkoja..." / "Loading venues..."

### Task 2 — app/business/map/page.tsx
New client component implementing:

- **BusinessMapPage** (outer): fetches all published venues via anon Supabase, fetches owned venue IDs via business session, renders loading spinner while data loads, then delegates to `BusinessMapInner` inside `MapProvider`
- **BusinessMapInner**: full-screen `<Map>` with `AdvancedMarker` + `SportPin` per venue (filtered by toggle state), Kaikki/Omat toggle pill floating at `top-16`, `PaikkaSheet` overlay at bottom on pin tap, `RecenterButton` for GPS centering
- **RecenterButton**: uses `useMap()` hook to call `panTo(coords)` on tap

### Task 3 — SportPin (no changes)
Confirmed `SportPin` accepts only `laji` and `animDelay` — selected state is handled via a wrapper `<div>` with `scale(1.25)` inline style. No SportPin.tsx modifications needed.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — data is fetched from Supabase on mount. No hardcoded empty values that flow to rendering.

## Threat Flags

None — no new network endpoints or auth paths introduced. The page uses existing Supabase clients with existing RLS. The business route is already protected by `app/business/layout.tsx` auth guard (Phase 41).

## Self-Check: PASSED

- [x] `app/business/map/page.tsx` exists at worktree path
- [x] `messages/fi.json` contains `mapToggleAll`, `mapToggleMine`, `mapLoadingVenues`
- [x] `messages/en.json` contains `mapToggleAll`, `mapToggleMine`, `mapLoadingVenues`
- [x] Commit ef2bdf8 exists (i18n)
- [x] Commit 607e3da exists (page)
- [x] `npx tsc --noEmit` — no TypeScript errors
- [x] No unexpected file deletions in either commit
