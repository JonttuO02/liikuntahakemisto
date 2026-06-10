---
phase: 34-onboarding-velhou
plan: "07"
subsystem: business-onboarding
tags:
  - file-upload
  - supabase-storage
  - drag-and-drop
  - wizard-step
dependency_graph:
  requires:
    - "34-05"  # save-step Route Handler
  provides:
    - UploadDropZone component
    - UploadProgressBar component
    - StepMediat (Step 2 of onboarding wizard)
  affects:
    - app/business/onboarding/
tech_stack:
  added: []
  patterns:
    - "HTML5 drag-and-drop (native events, no library)"
    - "supabase-js v2 Storage upload via createBrowserSupabase() (anon client)"
    - "CSS-only progress bar (transition-[width] — no Framer Motion)"
    - "File validation: MIME type + size before upload"
key_files:
  created:
    - app/business/onboarding/UploadDropZone.tsx
    - app/business/onboarding/UploadProgressBar.tsx
    - app/business/onboarding/StepMediat.tsx
  modified: []
decisions:
  - "Progress bar uses 10% on start / 100% on done (supabase-js v2 has no upload progress events)"
  - "Upload fires on Next click, not on file selection (wizard UX principle)"
  - "supabaseAdmin is never imported in client components — createBrowserSupabase() used exclusively"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-10T02:46:45Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 34 Plan 07: Media Upload Step Summary

## One-liner

Drag-and-drop media upload step with simulated progress bar (10%→100%) storing files to `business-media` Supabase Storage bucket and saving URLs to `onboarding_draft` via JWT-authenticated `save-step` Route Handler.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create UploadDropZone and UploadProgressBar | 9031463 | UploadDropZone.tsx, UploadProgressBar.tsx |
| 2 | Create StepMediat (Step 2 orchestrator) | 0c6d458 | StepMediat.tsx |

## What Was Built

### UploadDropZone.tsx

Reusable drag-and-drop file input component:
- HTML5 native drag events: `onDragOver`, `onDragLeave`, `onDrop` — no external library
- Click-to-select via hidden `<input type="file" className="sr-only" />`
- Keyboard accessible: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space
- File validation on selection: filters by `image/*` MIME type and `file.size <= maxFileSizeMB * 1024 * 1024`
- Animated thumbnails with Framer Motion `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` (duration 0.15)
- Visual states: inactive border (`rgba(0,0,0,0.12)`), drag-over border (`#111111` with subtle bg tint)

### UploadProgressBar.tsx

Pure CSS progress indicator:
- Returns `null` when `pct === 0` (invisible until upload starts)
- `transition-[width] duration-300 ease-out` — no Framer Motion
- Per UI-SPEC Animation Contract: upload progress bar uses CSS only

### StepMediat.tsx

Step 2 orchestrator component:
- Two `UploadDropZone` instances: logo (single file, 2 MB limit) and images (up to 5 files, 5 MB/file)
- Upload fires only on Next button click (`handleNext`), not on file selection
- Progress simulation: `setUploadProgress(10)` on start, `setUploadProgress(100)` after all uploads
- Storage paths: `{businessAccountId}/{paikkaId}/logo/{filename}` and `{businessAccountId}/{paikkaId}/photos/{filename}`
- `createBrowserSupabase()` used for all Supabase calls (anon client with active session)
- `supabaseAdmin` is NOT imported — enforces security requirement (T-34-07-02)
- JWT Authorization header in `save-step` POST call
- `save-step` body: `{ paikka_id, step: 2, field: 'media_urls', value: { logo, photos } }`
- Error handling: AnimatePresence fade, `role="alert"`, `aria-live="polite"`
- "Seuraava" button disabled during upload (`isUploading` state)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-34-07-01 (path tampering) | Storage path built from `businessAccountId` prop (from verified session) + `paikkaId` prop; no user-supplied path segments |
| T-34-07-02 (supabaseAdmin in client) | `createBrowserSupabase()` used exclusively; `supabaseAdmin` not imported |
| T-34-07-03 (oversized file bypass) | Client-side validation in UploadDropZone: `file.size <= maxFileSizeMB * 1024 * 1024` |
| T-34-07-04 (MIME spoofing) | `accept="image/*"` on file input + `file.type.startsWith('image/')` filter |

## Known Stubs

None. All data is wired: selected files flow through to Supabase Storage, URLs returned as public URLs and saved to `onboarding_draft` via `save-step`. The component receives `paikkaId` and `businessAccountId` as required props from the parent wizard.

## Self-Check: PASSED

- app/business/onboarding/UploadDropZone.tsx: EXISTS (created in commit 9031463)
- app/business/onboarding/UploadProgressBar.tsx: EXISTS (created in commit 9031463)
- app/business/onboarding/StepMediat.tsx: EXISTS (created in commit 0c6d458)
- Commit 9031463: EXISTS (feat(34-07): create UploadDropZone and UploadProgressBar components)
- Commit 0c6d458: EXISTS (feat(34-07): create StepMediat (Step 2 media upload orchestrator))
