# Phase 51: Live-esikatselu velhossa - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 51-Live-esikatselu velhossa
**Areas discussed:** Live preview scope (onboarding vs EditMode), EditMode card choice, update trigger granularity, desktop split-view layout, mobile toggle UX

---

## Live preview scope: onboarding wizard only, or also EditMode?

| Option | Description | Selected |
|--------|-------------|----------|
| Onboarding wizard only | EditMode keeps current click-to-open PreviewModal unchanged | |
| Both onboarding wizard and EditMode | EditMode's tabs also get a live side panel/toggle instead of the PreviewModal button | ✓ |

**User's choice:** Both onboarding wizard and EditMode.
**Notes:** Expands phase scope beyond the roadmap's literal "wizard step" wording to also cover the existing-venue tab editor. Required a REQUIREMENTS.md correction (see next question).

---

## EditMode card choice (CalloutCard vs PaikkaKortti)

| Option | Description | Selected |
|--------|-------------|----------|
| CalloutCard + DiagonaalKortti, update REQUIREMENTS.md | Same two cards as onboarding; REQUIREMENTS.md's Out-of-Scope row excluding this swap is removed/reworded | ✓ |
| Keep PaikkaKortti + DiagonaalKortti for EditMode | Leaves the out-of-scope note alone; two different card sets depending on mode | |

**User's choice:** CalloutCard + DiagonaalKortti, update REQUIREMENTS.md.
**Notes:** REQUIREMENTS.md's Out-of-Scope table row "`PreviewModal.tsx` (used in EditMode dashboard) CalloutCard swap" was removed; LIVEPREV-04 wording was updated to say "in both onboarding mode and EditMode." ROADMAP.md Phase 51 goal/criteria updated to mention EditMode explicitly (new criterion 5).

---

## Update trigger granularity — instant per-keystroke vs debounced

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced (~250-300ms) | Preview updates a beat after typing stops; avoids re-rendering 2 cards per keystroke | ✓ |
| Instant on every keystroke | Preview updates synchronously with onChange; simpler but more re-renders | |

**User's choice:** Debounced (~250-300ms).
**Notes:** Applies to free-text/numeric fields only. Discrete-selection fields (logo/photo file pick, color selection) update instantly regardless — no debounce needed since those aren't character-by-character entry.

---

## Desktop split-view layout — which card(s), how positioned

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed-width right column, both cards stacked | Form keeps its column; sticky/fixed-width preview column to the right shows CalloutCard above DiagonaalKortti | ✓ |
| Both cards side-by-side in the right column | CalloutCard and DiagonaalKortti next to each other horizontally | |
| Single switcher card in the right column | Only one card visible at a time with a tab/segmented control to switch | |

**User's choice:** Fixed-width right column, both cards stacked.
**Notes:** 2-column layout only activates above a wide-enough breakpoint; narrower viewports fall back to the mobile toggle pattern instead of squeezing a cramped 2-column layout.

---

## Mobile toggle UX — placement and interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented control above the form, persists across steps | Tab bar persists user's chosen side (form/preview) as they navigate Next/Prev | |
| Segmented control above the form, resets to form view each step | Same tab bar, but always lands back on "Muokkaa" when changing steps | ✓ |
| Floating button that opens a bottom sheet | FAB opens preview as a slide-up sheet, closer to current PreviewModal behavior | |

**User's choice:** Segmented control above the form, resets to form view each step.
**Notes:** Visual style should match existing tab-bar patterns already in `ProgressBar.tsx` and EditMode's tab bar.

---

## Claude's Discretion

- Exact Tailwind breakpoint for desktop split-view vs mobile toggle switch.
- Exact shape of the shared preview-state mechanism (single provider above both modes vs two instances) — architecture itself (React Context + reducer, no new state library) was already locked by REQUIREMENTS.md's existing Out-of-Scope note, predating this discussion.
- Debounce implementation: custom hook vs inline setTimeout/useEffect.
- Segmented-control visual styling specifics.
- How brandColor/accentColor derivation (currently only in StepEsikatselu.tsx) gets threaded into the live preview during steps 1-4.

## Deferred Ideas

None — discussion stayed within phase scope. The EditMode scope expansion was a deliberate in-discussion scope decision (with a corresponding REQUIREMENTS.md/ROADMAP.md edit), not a deferral to a future phase.
