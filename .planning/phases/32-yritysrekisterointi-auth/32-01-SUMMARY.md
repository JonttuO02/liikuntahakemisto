---
phase: 32-yritysrekisterointi-auth
plan: "01"
subsystem: i18n, routing
tags: [i18n, server-component, business, stub]
dependency_graph:
  requires: []
  provides: [Business-i18n-namespace, /business-route]
  affects: [32-02, 32-03]
tech_stack:
  added: []
  patterns: [next-intl/server getTranslations, async Server Component]
key_files:
  created:
    - app/business/page.tsx
  modified:
    - messages/fi.json
    - messages/en.json
decisions:
  - "Business namespace inserted between Auth and Map in both locale files"
  - "Stub page has no auth gate per D-07/D-08 — Phase 36 replaces with real dashboard"
  - "Server Component uses getTranslations (not useTranslations) — async import from next-intl/server"
metrics:
  duration: "~10 min"
  completed: "2026-06-05"
  tasks_completed: 2
  files_changed: 3
---

# Phase 32 Plan 01: Business i18n Namespace & Stub Page Summary

## One-liner

Lisatty 14-avaiminen Business-nimiavaruus fi.json ja en.json tiedostoihin seka luotu /business-reitin async Server Component -stubbisivu getTranslations-integraatiolla.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add "Business" namespace to fi.json and en.json | e2cf710 | messages/fi.json, messages/en.json |
| 2 | Create /business stub Server Component page | 47c57ee | app/business/page.tsx |

## What Was Built

**Task 1 — Business i18n namespace:**
Molempiin lokalisaatiotiedostoihin lisattiin 14-avaiminen `Business`-nimiavaruus `Auth`-lohkon jalkeen, ennen `Map`-lohkoa. Avaimet kattavat rekisterointilomakkeen tekstit (registerTitle, kentan placeholderit, CTA, loading-tila), virheilmoitukset (errorEmailInUse, errorWeakPassword, errorGeneric, errorAccountCreationFailed) seka dashboard-stubin tekstit (dashboardTitle, dashboardComingSoon). Molemmat tiedostot lapaisevat JSON.parse-validoinnin ja avainten lukumaara on tasan 14.

**Task 2 — /business stub page:**
Luotiin `app/business/page.tsx` asynkronisena Server Componenttina (ei 'use client'). Sivu kayttaa `getTranslations('Business')` next-intl/server -kirjastosta. Ulkoinen div on `min-h-screen bg-white flex flex-col items-center justify-center px-4`; sisainen div on `flex flex-col items-center gap-4 text-center`. H1 nayttaa dashboardTitle-avaimen (`text-xl font-bold text-[#111111]`), p-elementti nayttaa dashboardComingSoon-avaimen (`text-sm text-[rgba(17,17,17,0.45)]`). Sivulla ei ole NavBaria, auth-tarkistusta eika interaktiivisia elementteja — intentionaalisesti yksinkertainen stub (D-07, D-08).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Location | Reason |
|------|----------|--------|
| app/business/page.tsx | Entire page | Intentional stub per D-07/D-08; Phase 36 replaces with real dashboard (BIZPANEL-01--03) |

The stub is intentional by design — dashboardTitle and dashboardComingSoon content is the actual planned stub content for this phase, not a data-wiring problem.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced. The /business route is a public static stub per T-32-01-A (accepted).

## Self-Check: PASSED

- [x] messages/fi.json contains Business namespace with 14 keys (node verification -> 14)
- [x] messages/en.json contains Business namespace with 14 keys (node verification -> 14)
- [x] app/business/page.tsx exists on disk
- [x] app/business/page.tsx does not contain 'use client' (PASS)
- [x] Commit e2cf710 exists (feat(32-01): add Business i18n namespace)
- [x] Commit 47c57ee exists (feat(32-01): create /business stub Server Component page)
