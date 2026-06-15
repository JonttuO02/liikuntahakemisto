---
phase: 46-pre-vaihe-ui-velhointegraatio
plan: "04"
subsystem: onboarding-ui
tags: [state-machine, polling, branding, client-component, pre-vaihe]
dependency_graph:
  requires:
    - lib/branding/brandingResult.ts (BrandingResult — from 46-01)
    - app/api/business/analyze-website/route.ts (GET + POST)
    - lib/supabase-business.ts (createBusinessBrowserClient)
  provides:
    - app/business/onboarding/AnalysoiSivusto.tsx (AnalysoiSivusto default export)
  affects:
    - app/business/onboarding/page.tsx (will import AnalysoiSivusto in wave 3)
tech_stack:
  added: []
  patterns:
    - useRef-based interval polling with max-try cap (30 tries / 60s)
    - Stale-response guard via cancelled flag + mountedRef
    - Authorization Bearer token on every fetch (GET + POST)
    - Client-side URL prefix validation before POST
key_files:
  created:
    - app/business/onboarding/AnalysoiSivusto.tsx
  modified: []
decisions:
  - mountedRef used alongside cancelled flag — cancelled guards the on-mount async function, mountedRef guards the interval poll callback which has no closure over cancelled
  - getAuthToken() called fresh on every fetch (GET + POST + each poll tick) to avoid stale tokens on long-running analysis
  - tryCountRef.current incremented at the top of poll() before the fetch so a network error that skips the increment counter does not cause an infinite loop
  - Spinner sub-component accepts optional className for button-inline use (w-4 h-4) vs centred use (default w-6 h-6)
metrics:
  duration_seconds: 420
  completed_date: "2026-06-16"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 46 Plan 04: AnalysoiSivusto Component Summary

Full 6-phase pre-vaihe state machine as a client component: URL input, async website analysis with interval polling (30-try cap), error/timeout handling, and branding preview displaying logo, colour swatches, prices, and opening hours.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create AnalysoiSivusto component with full state machine | dc87377 | app/business/onboarding/AnalysoiSivusto.tsx |

## What Was Built

`app/business/onboarding/AnalysoiSivusto.tsx` — 423-line 'use client' component that orchestrates the complete pre-vaihe flow.

**Phase state machine (Phase type = 'checking' | 'url-input' | 'analyzing' | 'preview' | 'error' | 'timeout'):**

- **checking**: On mount, fetches GET /api/business/analyze-website with Bearer token. Navigates to `preview` (status=analyzed), `analyzing` (status=analyzing), or `url-input` (all other statuses / error).
- **url-input**: Shows heading, description paragraph, URL input field. Client-side validation requires http:// or https:// prefix. POST /api/business/analyze-website with { url } body. Per-status error messages (400/403/default). Submitting state disables button and shows inline spinner.
- **analyzing**: Interval poll every 2 000 ms capped at 30 tries (~60 s). On `analyzed` → preview. On `failed` → error. On tries exhausted → timeout. Ohita button always visible. Interval cleaned up on unmount and phase change.
- **preview**: Shows logo (img), brand colours (circular swatches with title tooltip), prices (ul), opening hours (dl). "Analysoi uudelleen" resets to url-input. "Jatka velhoon →" calls onConfirm(brandingResult).
- **error**: Finnish error message + Yritä uudelleen (→ url-input) + Ohita (→ onSkip()).
- **timeout**: Distinct message per D-PU-04 + same two-button layout as error.

**Security mitigations (threat model):**
- T-46-04-01: Client-side http/https prefix validation on URL before POST; server-side SSRF guard in route.ts
- T-46-04-02: tryCountRef cap at 30 + interval cleanup in useEffect return
- T-46-04-03: Authorization Bearer header on every GET and POST fetch call

## Verification

- `npx tsc --noEmit` läpäistiin ilman virheitä (koko projekti)
- Tiedosto sisältää 423 riviä (vaatimus ≥ 150)
- Tiedosto alkaa `'use client'`
- Default export: `function AnalysoiSivusto`
- Kaikki 6 vaihetta renderöidään JSX:ssä
- onConfirm kutsutaan preview-vaiheessa
- onSkip kutsutaan analyzing/error/timeout/url-input Ohita-napeista

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — kaikki vaiheet on täysin toteutettu ilman placeholder-arvoja.

## Threat Flags

None — komponentti käyttää vain olemassa olevia API-reittejä, ei luo uusia verkkorajapintoja.

## Self-Check: PASSED

- app/business/onboarding/AnalysoiSivusto.tsx exists: FOUND
- Commit dc87377 exists: FOUND
- TypeScript compilation: PASSED (no errors)
- Line count 423 >= 150: PASSED
