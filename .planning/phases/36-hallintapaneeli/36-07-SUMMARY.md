---
phase: 36
plan: "07"
subsystem: business-panel
tags: [preview, edit-wizard, integration, smoke-test]
dependency_graph:
  requires: [36-06, 36-03]
  provides: [BIZPANEL-03-per-step-preview]
  affects: [app/business/[id]/EditWizardInner.tsx]
tech_stack:
  added: []
  patterns: [AnimatePresence-modal-root-fragment, ml-auto-tab-bar-button]
key_files:
  created: []
  modified:
    - app/business/[id]/EditWizardInner.tsx
decisions:
  - Preview modal rendered at JSX fragment root (sibling to main div) to avoid z-index stacking issues inside flex containers
  - Preview shows server-fetched paikka prop (page-load state), not live form state — consistent with D-11
metrics:
  duration: "5 minutes"
  completed: "2026-06-10"
---

# Phase 36 Plan 07: Final Wiring + Smoke Test Summary

## One-liner

Per-step "Nayta esikatselu" button wired into EditWizardInner tab bar via previewOpen state and AnimatePresence-wrapped PreviewModal.

## What Was Done

### Task 1: Verified Muokkaa link in /business page.tsx

`app/business/page.tsx` line 167: `href={'/business/' + link.paikka_id}` — already uses `link.paikka_id` correctly. No code change needed.

### Task 2: Added previewOpen state + PreviewModal + button to EditWizardInner

- Added `import { useState }` from react
- Added `import { AnimatePresence } from 'framer-motion'`
- Added `import PreviewModal from '@/app/components/PreviewModal'`
- Added `const [previewOpen, setPreviewOpen] = useState(false)`
- Wrapped JSX return in `<>...</>` fragment so PreviewModal renders as a sibling to the main div (avoids z-index containment)
- `<AnimatePresence>` wraps `{previewOpen && <PreviewModal paikka={paikka} onClose={() => setPreviewOpen(false)} />}` for fade-in/out
- Added "Nayta esikatselu" button at the end of the tab-bar row with `ml-auto` for right-alignment
- Tab bar row updated to `items-center` to align tabs and preview button vertically

### Task 3: TypeScript check

`npx tsc --noEmit` — passes with no output (zero errors).

### Task 4: Smoke test checklist

See manual smoke test checklist below.

## Manual Smoke Test Checklist

### BIZPANEL-01: /business list
- [ ] /business loads and lists all venues for test business account
- [ ] Each row shows correct status badge (pending/approved/rejected)
- [ ] "Esikatselu" button opens PreviewModal with PaikkaKortti, DiagonaalKortti, PaikkaSheet
- [ ] PreviewModal closes on backdrop click and x button
- [ ] "Muokkaa" link navigates to /business/[id]

### BIZPANEL-02: Edit wizard
- [ ] /business/[id] renders with 5-tab bar (Step 1 locked)
- [ ] Tab 2 (Mediat): existing photos shown as thumbnails, x deletes, new upload appends, max-5 cap disables zone, "Tallenna" saves
- [ ] Tab 3 (Hinnasto): "Tallenna" saves to update-paikka, section=hinnasto
- [ ] Tab 4 (Aukioloajat): pre-filled from paikka data, "Tallenna" saves
- [ ] Tab 5 (Yhteystiedot): pre-filled from paikka data, "Tallenna" saves
- [ ] "Takaisin" returns to /business

### BIZPANEL-03: Preview
- [ ] "Nayta esikatselu" button in EditWizardInner tab bar opens PreviewModal
- [ ] Preview shows PaikkaKortti + DiagonaalKortti + PaikkaSheet
- [ ] PreviewModal closes on backdrop click and close button

### Security
- [ ] /business/[id] without auth redirects to /business/rekisteroidy
- [ ] POST /api/business/update-paikka with no token returns 401
- [ ] POST /api/business/update-paikka with valid token but wrong paikka_id returns 403

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Preview shows server-fetched paikka data (page-load snapshot). After a "Tallenna" save, users must reload the page to see updated preview data — this is intentional per D-11 and documented in the plan.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `app/business/[id]/EditWizardInner.tsx` modified — commit 20a00f7
- `npx tsc --noEmit` passes clean
