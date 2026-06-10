---
phase: 36
plan: "03"
subsystem: business-panel
tags: [preview-modal, business-page, esikatselu, framer-motion, i18n]
dependency_graph:
  requires: [36-01]
  provides: [PreviewModal component, Esikatselu/Muokkaa buttons on /business]
  affects: [app/business/page.tsx, app/components/PreviewModal.tsx]
tech_stack:
  added: []
  patterns: [AnimatePresence overlay, backdrop-click-to-close, stopPropagation panel]
key_files:
  created:
    - app/components/PreviewModal.tsx
  modified:
    - app/business/page.tsx
decisions:
  - PaikkaSheet used with preview=true and no-op callbacks (todo=false, onToggleTodo=()=>{}, onClose=()=>{}) — matches its preview prop contract
  - VenueLiikuntapaikka local type mirrors Liikuntapaikka fields needed; cast via `as unknown as Liikuntapaikka` at usage site
metrics:
  duration: "~5 minutes"
  completed: "2026-06-10T20:30:07Z"
  tasks_completed: 2
  files_changed: 2
---

# Phase 36 Plan 03: PreviewModal component + Esikatselu buttons on /business list Summary

Full-screen preview overlay component (PreviewModal) created and wired into the /business venue list with Esikatselu + Muokkaa action buttons on every venue row.

## What Was Built

**PreviewModal.tsx** — `'use client'` component with:
- Fixed full-screen overlay (`fixed inset-0 z-50 bg-black/50 overflow-y-auto`)
- Framer Motion `AnimatePresence` + `motion.div` fade-in/out (duration 0.2)
- Three preview sections: PaikkaKortti, DiagonaalKortti, PaikkaSheet (preview=true)
- Header with title (`t('previewCta')`) and × close button
- Bottom outlined pill close button (`t('previewClose')`)
- Backdrop click to close (onClick on overlay, stopPropagation on panel)

**app/business/page.tsx** — Extended with:
- `VenueLiikuntapaikka` type with all 17 liikuntapaikat columns needed for preview
- Updated Supabase select to fetch full venue data
- `previewPaikka: Liikuntapaikka | null` state
- `AnimatePresence`-wrapped `<PreviewModal>` at top of venue list return
- Per-row action buttons (all statuses): Esikatselu (text button) + Muokkaa (`<a href>` outlined pill)

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create app/components/PreviewModal.tsx | a8e786e |
| 2 | Extend app/business/page.tsx | a8e786e |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new network endpoints or auth paths introduced; modal is client-side only.

## Self-Check: PASSED

- `app/components/PreviewModal.tsx` exists: FOUND
- `app/business/page.tsx` modified: FOUND
- Commit a8e786e exists: FOUND
- `npx tsc --noEmit` passes: PASSED (no output = no errors)
