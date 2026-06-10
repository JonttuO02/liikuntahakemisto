---
plan: "34-10"
phase: "34-onboarding-velhou"
status: "complete"
requirements: ["ONBOARD-07"]
key-files:
  created: []
  modified:
    - app/components/PaikkaSheet.tsx
    - app/business/onboarding/StepEsikatselu.tsx
commits:
  - "8d73121 feat(34-10): add preview prop to PaikkaSheet"
  - "586365f feat(34-10): wire PaikkaSheet into StepEsikatselu preview step"
---

## Summary

Closed gap ONBOARD-07: Step 6 of the onboarding wizard now renders the real `PaikkaSheet` component alongside `PaikkaKortti` and `DiagonaalKortti`, as required by REQUIREMENTS.md and CONTEXT.md D-17.

### What was built

**Task 1 — PaikkaSheet `preview` prop:**
- Added `preview?: boolean` to Props interface; made `onClose` optional with `() => {}` default
- Reviews `useEffect`: early-return guard `if (preview) { setReviews([]); return }` — no Supabase call in preview mode
- `motion.div` style: conditional — `position: relative, height: auto, maxHeight: 600px` when preview vs fixed overlay otherwise
- Drag disabled: `drag={preview ? false : 'y'}` plus spread that omits `dragConstraints`, `dragElastic`, `onDragEnd` in preview mode
- Drag indicator pill: wrapped in `{!preview && ...}`
- Close button (X): wrapped in `{!preview && ...}`; bookmark button untouched

**Task 2 — StepEsikatselu wire-up:**
- Added `import PaikkaSheet from '@/app/components/PaikkaSheet'`
- Removed NOTE comment block explaining why PaikkaSheet was previously excluded
- Replaced simplified inline glass card (div with h3/p tags) with `<PaikkaSheet paikka={draftAsPaikka} preview={true} todo={false} onClose={() => {}} onToggleTodo={() => {}} />`

### Verification

- `grep -n "preview" PaikkaSheet.tsx` — 8 lines: interface, function sig, useEffect guard, deps array, style conditional, drag conditional, drag indicator guard, close button guard ✓
- `grep -c "draftAsPaikka.nimi" StepEsikatselu.tsx` → 0 (inline card removed) ✓
- `grep -n "PaikkaSheet" StepEsikatselu.tsx` → 2 lines (import + render) ✓
- `npx tsc --noEmit` → no output (zero errors) ✓

### Deviations

None. All six targeted PaikkaSheet modifications and the StepEsikatselu replacement implemented exactly as specified.

## Self-Check: PASSED
