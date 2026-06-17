---
phase: 49-esikatselu-ja-kontrastikorjaukset
plan: 02
subsystem: business-onboarding
tags: [onboarding, preview, i18n, calloutcard]
dependency_graph:
  requires: []
  provides:
    - "previewLabelCallout i18n key (fi/en)"
    - "Step 6 onboarding preview renders CalloutCard instead of PaikkaKortti"
  affects:
    - app/business/onboarding/StepEsikatselu.tsx
tech_stack:
  added: []
  patterns:
    - "Coordinate type-satisfaction shim (?? 0) for static-preview-only CalloutCard usage"
key_files:
  created: []
  modified:
    - messages/fi.json
    - messages/en.json
    - app/business/onboarding/StepEsikatselu.tsx
decisions:
  - "previewLabelCard key left untouched (shared with out-of-scope PreviewModal.tsx) — new previewLabelCallout key added instead, per D-01"
  - "Dummy 0 coordinate fallback is a pure type shim; CalloutCard's render body never reads lat/lng, so no placeholder/empty-state component was built, per D-02"
metrics:
  duration: "10min"
  completed: 2026-06-17
---

# Phase 49 Plan 02: Step 6 CalloutCard Swap Summary

Swapped the unused `PaikkaKortti` for the live-map `CalloutCard` in the onboarding wizard's Step 6 preview, with a new `previewLabelCallout` caption key, so the business owner's first preview slot now matches what venues actually see on the map.

## Tasks Completed

### Task 1: Add previewLabelCallout i18n key to both message files — DONE

Added `"previewLabelCallout": "KARTTAKORTTI"` to `messages/fi.json` and `"previewLabelCallout": "MAP CALLOUT"` to `messages/en.json`, placed adjacent to the existing `previewLabelCard`/`previewLabelDiag`/`previewLabelSheet` keys in the Business namespace. The pre-existing `previewLabelCard` key was left fully intact (still used by out-of-scope `PreviewModal.tsx`, per D-01).

- Commit: `8687cbb` — feat(49-02): add previewLabelCallout i18n key
- Verified: automated node script confirmed both new keys exist with correct values and `previewLabelCard` was not removed.

### Task 2: Swap PaikkaKortti for CalloutCard in StepEsikatselu Step 6 first preview slot — DONE

In `app/business/onboarding/StepEsikatselu.tsx`:
- Replaced `import PaikkaKortti from '@/app/components/PaikkaKortti'` with `import CalloutCard from '@/app/components/CalloutCard'`.
- Replaced `<PaikkaKortti paikka={draftAsPaikka} />` with `<CalloutCard p={{ ...draftAsPaikka, latitude: draftAsPaikka.latitude ?? 0, longitude: draftAsPaikka.longitude ?? 0 }} />` — the `?? 0` fallback is a pure type-satisfaction shim since `CalloutCard`'s render body never reads `p.latitude`/`p.longitude` (per D-02).
- Changed the section caption from `t('previewLabelCard')` to `t('previewLabelCallout')`, and updated the leading comment from `{/* LISTAKORTTI */}` to `{/* KARTTAKORTTI */}`.
- Left the `DiagonaalKortti` and `PaikkaSheet` preview sections below completely untouched (per D-01).

- Commit: `f46e1f1` — feat(49-02): swap PaikkaKortti for CalloutCard in Step 6 preview
- Verified:
  - `grep` confirmed `CalloutCard` import present, `previewLabelCallout` present, coordinate shim present, `PaikkaKortti` fully removed, and `DiagonaalKortti`/`PaikkaSheet` still present.
  - `npx tsc --noEmit` passed with zero errors across the whole project — the coordinate shim resolves the `number | null` vs `number` type mismatch cleanly.

### Task 3: Human-verify Step 6 CalloutCard swap — APPROVED

`checkpoint:human-verify gate="blocking"`. Approved by user on 2026-06-17 — Step 6's first preview slot renders the map-style `CalloutCard` with the new "KARTTAKORTTI"/"MAP CALLOUT" caption, renders without crashing for a draft missing coordinates, and the `DiagonaalKortti`/`PaikkaSheet` sections below are unchanged.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2.

## Authentication Gates

None encountered.

## Known Stubs

None — no stub data or placeholder UI introduced by this plan.

## Threat Flags

None — this plan only swaps an existing presentational component and adds two i18n strings; no new network endpoints, auth paths, file access patterns, or schema changes. Per the plan's own threat model (T-49-03 accept, T-49-04 mitigate via the `?? 0` shim, T-49-05 accept — no new dependencies), all threats were addressed within the implementation itself.

## Self-Check: PASSED

- FOUND: app/business/onboarding/StepEsikatselu.tsx
- FOUND: messages/fi.json
- FOUND: messages/en.json
- FOUND commit: 8687cbb
- FOUND commit: f46e1f1
