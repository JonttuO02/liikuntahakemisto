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

### Task 3: Human-verify Step 6 CalloutCard swap — AWAITING HUMAN VERIFICATION

This is a `checkpoint:human-verify gate="blocking"` task. No code changes — manual browser verification only, which this executor cannot perform. Tasks 1 and 2's automated verification (grep + `tsc --noEmit`) passed, but the actual visual/runtime confirmation in a running dev server (Step 6 of the onboarding wizard, with and without a draft missing coordinates) has not been performed and requires a human to:

1. Run `npm run dev` and step a business account through onboarding to Step 6.
2. Confirm the first preview card is now the map-style `CalloutCard` (diagonal-clipped speech-bubble with sport icon, animated name/sport toggle) — not the old flat `PaikkaKortti` — captioned "KARTTAKORTTI" (FI) / "MAP CALLOUT" (EN).
3. Confirm it renders without crashing for a draft venue with no coordinates yet.
4. Confirm the `DiagonaalKortti` and `PaikkaSheet` sections below are unchanged.

See the plan's Task 3 `<how-to-verify>` block for full step-by-step instructions and the `<resume-signal>` for how to respond.

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
