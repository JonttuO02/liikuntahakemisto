---
phase: 30-i18n-fien
plan: "01"
subsystem: i18n
tags: [next-intl, i18n, tdd, infrastructure, cookie]
dependency_graph:
  requires: []
  provides: [next-intl-provider, resolveLocale, message-files, changeLocaleAction, i18n-request-config]
  affects: [app/layout.tsx, next.config.mjs]
tech_stack:
  added: [next-intl@4.13.0]
  patterns: [without-routing cookie-based locale, TDD unit test, Server Action cookie write, NextIntlClientProvider]
key_files:
  created:
    - lib/i18nUtils.ts
    - lib/i18nUtils.test.ts
    - messages/fi.json
    - messages/en.json
    - i18n/request.ts
    - global.d.ts
    - app/actions/locale.ts
  modified:
    - next.config.mjs
    - app/layout.tsx
    - package.json
    - package-lock.json
decisions:
  - "resolveLocale uses SUPPORTED_LOCALES whitelist to prevent path traversal via malformed NEXT_LOCALE cookie (T-30-01)"
  - "i18n/request.ts delegates to resolveLocale from lib/i18nUtils.ts instead of duplicating logic"
  - "NextIntlClientProvider placed inside MapProvider (between MapProvider and main) per PATTERNS.md"
  - "changeLocaleAction in separate app/actions/locale.ts file to avoid prop-drilling"
  - "next-intl v4 NextIntlClientProvider: no messages prop needed — auto-reads from server request config"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-04"
  tasks_completed: 3
  files_created: 9
  files_modified: 4
---

# Phase 30 Plan 01: i18n Infrastructure — Summary

**One-liner:** next-intl@4.13.0 infrastruktuuri: resolveLocale TDD-utility, 11-namespace viesti-tiedostot (FI+EN), NEXT_LOCALE cookie -pohjainen getRequestConfig, changeLocaleAction server action, NextIntlClientProvider layout.tsx:ssa.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | resolveLocale utility + TDD tests | bec5098 | lib/i18nUtils.ts, lib/i18nUtils.test.ts |
| 2 | Install next-intl + message files + i18n infrastructure | 2195971 | package.json, package-lock.json, messages/fi.json, messages/en.json, i18n/request.ts, global.d.ts, app/actions/locale.ts |
| 3 | next.config.mjs plugin wrap + layout.tsx NextIntlClientProvider | 9a90fbf | next.config.mjs, app/layout.tsx |

## Verification Results

```
npx vitest run lib/i18nUtils.test.ts --reporter=verbose
  6 tests pass (resolveLocale suite)

npx vitest run
  70 tests pass (full suite — 8 test files)

npx tsc --noEmit --skipLibCheck
  0 errors
```

## Key Decisions

- `resolveLocale` extracted to `lib/i18nUtils.ts` (testable utility) — `i18n/request.ts` delegates validation to it. Pitfall: path traversal via NEXT_LOCALE cookie prevented by SUPPORTED_LOCALES whitelist (T-30-01).
- TDD RED/GREEN executed: tests written and verified failing before implementation.
- `withNextIntl` outermost, `withSerwist` innermost in next.config.mjs HOC composition (Pitfall 4 avoided).
- `NextIntlClientProvider` wraps `<main>` inside `<MapProvider>` — avoids hydration mismatch (Pitfall 1 avoided).
- Separate `app/actions/locale.ts` server action file — avoids prop-drilling from layout to ProfiiliClient.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan delivers pure infrastructure (no UI rendering). Message files contain all translation strings but none are used yet; components use hard-coded strings until plans 30-02 through 30-04 wire them.

## Threat Surface Scan

No new security-relevant surface beyond what is documented in the plan's threat model:
- T-30-01 (path traversal via NEXT_LOCALE cookie): mitigated via resolveLocale whitelist
- T-30-02 (changeLocaleAction locale parameter): mitigated via TypeScript 'fi' | 'en' type
- T-30-03 (cookie session hijack): accepted (UI language only, no auth/PII)
- T-30-SC (npm install next-intl): mitigated (Package Legitimacy Audit: Approved)

## Self-Check: PASSED

Files exist:
- FOUND: lib/i18nUtils.ts
- FOUND: lib/i18nUtils.test.ts
- FOUND: messages/fi.json (11 namespaces: Nav, PaikkaKortti, PaikkaSheet, Filters, Todo, Profiili, Auth, Map, PaikkaPage, NotFound, Days)
- FOUND: messages/en.json (parallel structure)
- FOUND: i18n/request.ts (contains getRequestConfig, resolveLocale)
- FOUND: global.d.ts (contains AppConfig)
- FOUND: app/actions/locale.ts (first line: 'use server')
- FOUND: next.config.mjs (contains withNextIntl, createNextIntlPlugin)
- FOUND: app/layout.tsx (contains NextIntlClientProvider, async function RootLayout)

Commits exist:
- bec5098: feat(30-01): add resolveLocale utility with TDD unit tests
- 2195971: feat(30-01): install next-intl, add message files and i18n infrastructure
- 9a90fbf: feat(30-01): wire NextIntlClientProvider in layout, wrap config with withNextIntl
