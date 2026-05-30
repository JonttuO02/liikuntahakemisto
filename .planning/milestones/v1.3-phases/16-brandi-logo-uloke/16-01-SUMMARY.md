---
phase: 16-brandi-logo-uloke
plan: "01"
subsystem: metadata
tags: [rebrand, metadata, pwa, privacy]
dependency_graph:
  requires: []
  provides: [BRAND-01-metadata]
  affects: [browser-tab-title, og-title, pwa-manifest, tietosuoja]
tech_stack:
  added: []
  patterns: [Next.js Metadata API, MetadataRoute.Manifest]
key_files:
  modified:
    - app/layout.tsx
    - app/manifest.ts
    - app/tietosuoja/page.tsx
  created: []
decisions:
  - "AKTIIVI replaces Liikuntahakemisto in all user-visible metadata"
  - "manifest start_url fixed from dead /?nakyma=lista to /"
  - "og:title auto-derives from metadata.title — no separate openGraph block needed"
metrics:
  duration: "~10 min"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
requirements: [BRAND-01]
---

# Phase 16 Plan 01: Metadata Rebrand to AKTIIVI — Summary

**One-liner:** Renamed brand from "Liikuntahakemisto" to "AKTIIVI" in Next.js metadata, PWA manifest, and privacy policy; fixed dead start_url param.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update Next.js metadata and PWA manifest to AKTIIVI | 4f046c1 | app/layout.tsx, app/manifest.ts |
| 2 | Update privacy policy body text to AKTIIVI | f970057 | app/tietosuoja/page.tsx |

## Changes Made

### Task 1 — metadata + manifest

**app/layout.tsx**
- `metadata.title`: `'Liikuntahakemisto'` → `'AKTIIVI'`
- `metadata.description`: `'Löydä liikuntapaikat läheltäsi Tampereella'` → `'Löydä liikuntapaikat läheltäsi — AKTIIVI'`

**app/manifest.ts**
- `name`: `'Liikuntahakemisto'` → `'AKTIIVI'`
- `short_name`: `'Liikunta'` → `'AKTIIVI'`
- `start_url`: `'/?nakyma=lista'` → `'/'` (dead parameter removed per CLAUDE.md constraint)

### Task 2 — privacy policy

**app/tietosuoja/page.tsx**
- Rekisterinpitäjä paragraph: `"rekisterinpitäjä on Liikuntahakemisto"` → `"rekisterinpitäjä on AKTIIVI"`
- One occurrence replaced; no structural or styling changes

## Verification Results

1. `grep -rn "Liikuntahakemisto" app/layout.tsx app/manifest.ts app/tietosuoja/page.tsx` → 0 matches (exit 1 = no matches found)
2. `grep -n "AKTIIVI" app/layout.tsx app/manifest.ts app/tietosuoja/page.tsx` → hits in all 3 files
3. `grep "start_url" app/manifest.ts` → `start_url: '/'`
4. `npm run build` → exit 0, 13 static pages generated

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three files now contain AKTIIVI consistently; no placeholder text introduced.

## Threat Flags

No new security-relevant surface introduced. Changes are pure static text/config:
- metadata.title and og:title (auto-derived): public brand name, not sensitive (T-16P1-02 accepted)
- manifest start_url change from dead param to '/': no security regression (T-16P1-01 accepted)

## Self-Check: PASSED

- app/layout.tsx: verified AKTIIVI at lines 11-12
- app/manifest.ts: verified AKTIIVI at lines 5-6, start_url '/' at line 8
- app/tietosuoja/page.tsx: verified AKTIIVI at line 34, 0 occurrences of old brand
- Commit 4f046c1: exists in git log
- Commit f970057: exists in git log
- Build: passed with 0 errors
