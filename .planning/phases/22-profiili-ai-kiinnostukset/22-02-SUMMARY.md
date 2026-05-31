---
phase: 22-profiili-ai-kiinnostukset
plan: "02"
subsystem: profile-ui
tags: [react, supabase, ui, glassmorphism, interests]
dependency_graph:
  requires:
    - 22-01 (kiinnostukset text[] column in profiles table)
  provides:
    - app/profiili/ProfiiliClient.tsx (kiinnostukset card UI, handleSaveKiinnostukset, loadProfile extended)
  affects:
    - /profiili page (authenticated view now has kiinnostukset card)
tech_stack:
  added: []
  patterns:
    - Sport pill toggle with selected/unselected glassmorphism states
    - Supabase upsert with onConflict user_id for partial profile updates
    - useState string[] for multi-select sport interest state
key_files:
  created: []
  modified:
    - app/profiili/ProfiiliClient.tsx
decisions:
  - "Pills use only bg-[#111111]/border colors — no sport accent colors from lajiKonfig (D-01)"
  - "kiinnostukset card placed immediately after kotikaupunki card, before Takaisin link"
  - "Each card (kotikaupunki, kiinnostukset) has its own separate Tallenna button and feedback state"
metrics:
  duration: "~8 min"
  completed: "2026-05-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 1
---

# Phase 22 Plan 02: Kiinnostukset-kortti ProfiiliClient-komponenttiin Summary

**One-liner:** Kiinnostukset-kortti lisatty ProfiiliClient.tsx:aan — 9 lajipillia flex-wrap-layoutissa, toggle-tila, Supabase upsert tallennuslogiikalla ja inline-palaute.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend loadProfile and add kiinnostukset state | e71d194 | app/profiili/ProfiiliClient.tsx |
| 2 | Add kiinnostukset card to authenticated JSX | 39999c3 | app/profiili/ProfiiliClient.tsx |

## What Was Built

### Task 1 — State, handlers, loadProfile extension

`ProfiiliClient.tsx` extended with:

- `import { lajiKonfig } from '@/lib/lajit'` — sport labels source of truth
- `kiinnostukset: string[]` state initialized to `[]`
- `savedKiinnostukset: boolean` state for inline save feedback
- `loadProfile` query extended to `.select('kotikaupunki, kiinnostukset')` — pre-populates both fields on mount
- `setKiinnostukset([])` added to the logged-out else branch for clean reset
- `toggleKiinnostus(key)` function — adds or removes sport key from array
- `handleSaveKiinnostukset()` — upserts `{ user_id, kiinnostukset, updated_at }` with `onConflict: 'user_id'`, sets `savedKiinnostukset` true for 2500ms

### Task 2 — Kiinnostukset card JSX

New `.glass rounded-2xl p-4 flex flex-col gap-3 mt-4` card rendered below the kotikaupunki card in the authenticated return:

- Label: "KIINNOSTUKSEN KOHTEET" (caps, tracking-widest)
- `flex flex-wrap gap-2` pill container with one `<button>` per laji from `Object.entries(lajiKonfig)`
- Selected pill: `bg-[#111111] text-white` — unselected: `border border-[rgba(0,0,0,0.12)] bg-white`
- All transitions use `[transition:background-color_150ms_var(--ease-out)]` — no sport accent colors
- Tallenna button calls `handleSaveKiinnostukset`
- `{savedKiinnostukset && <p className="text-sm text-green-700">Kiinnostukset tallennettu</p>}` inline feedback

## Deviations from Plan

None — plan executed exactly as written. Both tasks were implemented to match the spec precisely. The decision to commit Task 1 and Task 2 as separate commits (even though both modify the same file) matches the plan's atomic commit requirement.

## Known Stubs

None — the kiinnostukset card is fully wired: state pre-populated from Supabase on load, toggle updates local state, save persists to Supabase, success feedback clears after 2.5s.

## Threat Flags

No new security-relevant surface beyond what the plan's threat model covers. The upsert is protected by RLS (`auth.uid() = user_id`) — cross-user writes are rejected at the DB level. Array values are sport keys from a closed UI enum (lajiKonfig) — no freeform input accepted.

## Self-Check: PASSED

- [x] `app/profiili/ProfiiliClient.tsx` exists in worktree — FOUND
- [x] `import { lajiKonfig } from '@/lib/lajit'` present — line 8
- [x] `useState<string[]>([])` for kiinnostukset — line 19
- [x] `useState(false)` for savedKiinnostukset — line 20
- [x] `.select('kotikaupunki, kiinnostukset')` in loadProfile — line 28
- [x] `setKiinnostukset(data?.kiinnostukset ?? [])` after setKotikaupunki — line 33
- [x] `setKiinnostukset([])` in logged-out else branch — line 46
- [x] `toggleKiinnostus` function defined — line 67
- [x] `handleSaveKiinnostukset` function with upsert — line 71
- [x] "Kiinnostuksen kohteet" label in JSX — line 149
- [x] `Object.entries(lajiKonfig)` for pill rendering — line 152
- [x] "Kiinnostukset tallennettu" success text — line 173
- [x] No sport colors (accentBg/badgeTw) on pills — confirmed
- [x] `npx tsc --noEmit` passes — exit 0
- [x] Commit e71d194 exists — feat(22-02): extend ProfiiliClient with kiinnostukset state and save handler
- [x] Commit 39999c3 exists — feat(22-02): add kiinnostukset card to authenticated ProfiiliClient JSX
