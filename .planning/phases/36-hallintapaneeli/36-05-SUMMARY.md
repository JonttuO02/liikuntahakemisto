---
phase: 36
plan: "05"
subsystem: business/edit-wizard
tags: [edit-mode, media-upload, storage-delete, step-media]
dependency_graph:
  requires: [36-04]
  provides: [step-media-edit-mode]
  affects: [EditWizardInner, StepMediat, UploadDropZone]
tech_stack:
  added: []
  patterns: [storage-path-extraction, non-blocking-storage-delete, conditional-save-vs-next]
key_files:
  created: []
  modified:
    - app/business/onboarding/StepMediat.tsx
    - app/business/onboarding/UploadDropZone.tsx
    - app/business/[id]/EditWizardInner.tsx
decisions:
  - Upload logic duplicated in handleSave rather than extracted — avoids risk of breaking onboarding handleNext flow
  - photosAtMax disabled prop passed only when editMode=true — onboarding keeps original uncapped behavior
  - saveError displayed alongside saveSuccessVisible using AnimatePresence, never both at once in practice
metrics:
  duration: "~8 minutes"
  completed: "2026-06-10"
  tasks_completed: 2
  files_changed: 3
---

# Phase 36 Plan 05: StepMediat editMode — photo management and save

**One-liner:** Extended StepMediat with editMode props for per-photo Storage delete, max-5 cap, and Tallenna save to update-paikka; wired into EditWizardInner step 2.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend StepMediat with editMode | 83d3c14 | StepMediat.tsx, UploadDropZone.tsx |
| 2 | Wire StepMediat into EditWizardInner step 2 | 83d3c14 | EditWizardInner.tsx |

## What Was Built

**StepMediat.tsx — editMode additions:**
- `editMode?: boolean`, `initialPaikka?: Liikuntapaikka | null`, `onSaveSuccess?: () => void` props added
- State initialized from `initialPaikka.logo_url` / `initialPaikka.photo_urls` when `editMode=true`
- `handleDeleteExistingPhoto`: extracts Storage path from public URL, calls `supabase.storage.remove`, removes from React state (non-blocking — UI updates even if Storage delete fails)
- `totalPhotos = existingPhotoUrls.length + photoFiles.length` — when >= 5, photo UploadDropZone receives `disabled={true}` and `photoMaxReached` message shown
- `handleSave`: uploads any new logo/photo files, then POSTs `{ paikka_id, section: 'mediat', data: { logo_url, photo_urls } }` to `/api/business/update-paikka` with Bearer token
- Edit mode footer: Tallenna button (shows `saving` text while in-flight, disabled during save); onPrev disabled while saving
- `saveSuccessVisible` state drives 2-second success message via AnimatePresence

**UploadDropZone.tsx:**
- Added `disabled?: boolean` (default `false`) to props interface
- When disabled, wrapper div gets `pointer-events-none opacity-60` — all existing callers unaffected

**EditWizardInner.tsx:**
- Imported StepMediat from `'../onboarding/StepMediat'`
- Replaced step 2 TODO placeholder with `<StepMediat paikkaId={paikkaId} initialPaikka={paikka} editMode={true} onNext/onPrev/onSaveSuccess />`

## Deviations from Plan

**1. [Decision] Upload logic duplicated in handleSave rather than extracted into shared helper**
- The plan suggested extracting upload logic into `uploadLogo`/`uploadPhotos` helpers or calling `handleNext` internally
- Instead, upload code was duplicated in `handleSave` to avoid refactoring risk on the onboarding path
- Both paths are isolated: `handleNext` still calls `onNext()` after save-step API; `handleSave` calls update-paikka API
- No functional impact — both paths produce identical Storage upload behavior

## Known Stubs

None — the save path is fully wired to `/api/business/update-paikka`.

## Threat Flags

None — all file writes go through authenticated Storage paths derived from `session.user.id`, not from props.

## Self-Check: PASSED

- [x] `app/business/onboarding/StepMediat.tsx` — modified and committed (83d3c14)
- [x] `app/business/onboarding/UploadDropZone.tsx` — modified and committed (83d3c14)
- [x] `app/business/[id]/EditWizardInner.tsx` — modified and committed (83d3c14)
- [x] `tsc --noEmit` — no errors
