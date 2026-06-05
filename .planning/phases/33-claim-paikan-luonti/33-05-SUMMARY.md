---
phase: 33-claim-paikan-luonti
plan: "05"
subsystem: business-ui
tags:
  - claim
  - create-venue
  - framer-motion
  - supabase-client
  - i18n
dependency_graph:
  requires:
    - "33-02 (claim-paikka route handler)"
    - "33-03 (create-paikka route handler)"
    - "lib/supabaseSSR.ts (createBrowserSupabase)"
    - "messages/fi.json + messages/en.json (Business namespace keys)"
  provides:
    - "app/components/ClaimSearchForm.tsx — 3-step claim/create client component"
  affects:
    - "app/business/page.tsx — imports ClaimSearchForm (plan 33-04)"
tech_stack:
  added: []
  patterns:
    - "AnimatePresence mode='wait' for step transitions (opacity crossfade)"
    - "useRef debounce timer for 300ms Supabase ilike search"
    - "JWT from supabase.auth.getSession() for API Authorization header"
    - "Conditional aria-disabled + cursor-not-allowed for claimed venue cards"
key_files:
  created:
    - app/components/ClaimSearchForm.tsx
  modified: []
decisions:
  - "createKaupunki defaults to 'Tampere' for Step 3 (required field, no empty allowed)"
  - "Results list AnimatePresence keyed on query+kaupunki string to re-trigger on filter change"
  - "outer div uses aria-live='polite' to announce step changes to screen readers"
  - "handleClaim/handleCreate both call getSession() immediately before fetch — fresh token"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-05"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 33 Plan 05: ClaimSearchForm Summary

ClaimSearchForm — 3-step client component (search, claim confirm, create) with AnimatePresence step transitions, 300ms debounced Supabase ilike search, JWT Bearer API calls, and full i18n via useTranslations('Business').

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ClaimSearchForm with Step 1 search and result cards | a338ff0 | app/components/ClaimSearchForm.tsx |

## What Was Built

`app/components/ClaimSearchForm.tsx` — a `'use client'` component implementing the full claim/create flow as a single component with internal `Step = 'search' | 'claim' | 'create'` state.

**Step 1 (search):**
- `<input>` + `<select>` kaupunki dropdown (Kaikki kaupungit / Tampere / Helsinki / Turku)
- useEffect + useRef debounce timer (300ms) triggers Supabase ilike query on `nimi` when `query.length >= 2`; clears results on shorter input
- `published = true` filter applied; results capped at 8 via `.limit(8)`
- Results animate in as a group via `AnimatePresence` keyed on `query + kaupunki`
- Claimed venues: `aria-disabled="true"`, `cursor-not-allowed`, muted name text `text-[rgba(17,17,17,0.35)]`, `bg-[rgba(17,17,17,0.04)]` surface, "JO HALLITTU" micro badge + `sr-only` span
- Unclaimed venues: "Valitse" outlined button with `aria-label="Valitse: [nimi]"`
- Empty state (0 results + query >= 2): animated `p` with `t('searchNoResults')`
- "Luo uusi paikka" CTA: animated `motion.button` shown when `query.length >= 2`

**Step 2 (claim):**
- Back button with `whileTap={{ scale: 0.95 }}` + `aria-label`
- Selected venue display (label, nimi, osoite+kaupunki joined)
- `handleClaim`: gets session token, POSTs to `/api/business/claim-paikka`, handles 409 → `errorClaimAlreadyTaken`, other errors → `errorClaimFailed`, success → `router.push('/business')`
- Error block via `AnimatePresence` with `role="alert"` + `aria-live="polite"`

**Step 3 (create):**
- Back button (same style as Step 2)
- `<h2>` with `t('createTitle')`
- Form: nimi input, osoite input, kaupunki select (defaults to "Tampere")
- `handleCreate`: client validation (empty nimi → `errorNameRequired`, empty osoite → `errorAddressRequired`), then POSTs to `/api/business/create-paikka`, error → `errorCreateFailed`, success → `router.push('/business')`

**Outer step wrapper:** Single `AnimatePresence mode="wait"` with `key={step}` for pure opacity crossfade (duration 0.2) between all three steps.

## Animation Values (UI-SPEC compliance)

| Context | Values |
|---------|--------|
| Step transition | `opacity 0→1`, `duration: 0.2`, `AnimatePresence mode="wait"` |
| Results list | `opacity 0→1`, `duration: 0.15`, keyed on `query+kaupunki` |
| Empty state / create CTA / error | `opacity 0→1`, `duration: 0.15` |
| Back button tap | `whileTap={{ scale: 0.95 }}` |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints introduced (component is purely client-side and calls existing route handlers from 33-02 and 33-03). JWT retrieved fresh from `supabase.auth.getSession()` before each API call — T-33-05-02 mitigated. Search uses anon key with `published = true` filter — T-33-05-01 accepted per threat model.

## Self-Check

- [x] `app/components/ClaimSearchForm.tsx` exists (created at a338ff0)
- [x] Commit a338ff0 verified in git log
- [x] TypeScript compiles without errors (`npx tsc --noEmit` — no output = clean)
- [x] No unexpected file deletions

## Self-Check: PASSED
