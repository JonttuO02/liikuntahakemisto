# Phase 49: Esikatselu- ja kontrastikorjaukset - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 49-Esikatselu- ja kontrastikorjaukset
**Areas discussed:** Step 6 layout, No-coords fallback, Contrast fix primitive scope, Reword PREV-03, Backdrop style

---

## Step 6 layout

| Option | Description | Selected |
|--------|-------------|----------|
| Swap only the first slot | Replace just PaikkaKortti with CalloutCard; relabel caption | ✓ |
| Swap and reorder | Replace and also reorder sections to match live appearance order | |

**User's choice:** Swap only the first slot.
**Notes:** None.

---

## No-coords fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Static placeholder card | Simplified non-interactive mock with "Sijainti puuttuu" note | |
| Plain message, no card | Skip the card, show muted explanatory text | |
| Let me describe something else | Freeform | ✓ |

**User's choice (freeform):** "Calloutcard shouldn't be in the map on previews. The user should just see the visual look of the actual card."
**Notes:** Led to confirming CalloutCard never reads `p.latitude`/`p.longitude` in its render body — so the fix is a type-satisfaction shim (dummy coordinate), not a real fallback UI. Captured as D-02.

---

## Contrast fix — primitive scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed neutral backdrop | Always render logo on fixed mid-tone backdrop | |
| Detect & adapt backdrop | Inspect logo_type/colors, choose adaptive backdrop | |
| Let me describe something else | Freeform | ✓ |

**User's choice (freeform):** Clarified the real bug is only in AnalysoiSivusto's logo-candidate picker (always-white background); DiagonaalKortti/PaikkaSheet already work because user picks a fitting background color. Led to a follow-up question on whether to refactor all three render sites anyway.

**Follow-up — "Primitive scope":**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, refactor all three | Extract one primitive, use in AnalysoiSivusto, DiagonaalKortti, PaikkaSheet | |
| No, only fix AnalysoiSivusto | Add contrast-safe backdrop only where the bug occurs | ✓ |

**User's choice:** No, only fix AnalysoiSivusto.
**Notes:** Minimizes risk to live cards that already work. Captured as D-03.

---

## Reword PREV-03

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, narrow the wording | Update PREV-03/ROADMAP criterion 2 to match decided scope | ✓ |
| No, leave it as-is | Keep original wording, rely on CONTEXT.md alone | |

**User's choice:** Yes, narrow the wording.
**Notes:** REQUIREMENTS.md and ROADMAP.md edited 2026-06-17, committed alongside this CONTEXT.md (D-05).

---

## Backdrop style

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed mid-gray box | `rgba(0,0,0,0.06)` box matching DiagonaalKortti's existing tint | ✓ |
| Checkerboard (transparency-aware) | Figma/Photoshop-style transparency checkerboard | |
| Let me describe something else | Freeform | |

**User's choice:** Fixed mid-gray box.
**Notes:** Matches existing precedent in the codebase rather than introducing a new visual pattern. Captured as D-04.

---

## Claude's Discretion

- Exact component name/file location for the new shared logo-thumbnail primitive.
- Exact Finnish caption text for Step 6's relabeled CalloutCard section.
- Whether the dummy-coordinate fallback uses an inline `?? 0` or a named helper/constant.

## Deferred Ideas

- Refactoring DiagonaalKortti.tsx/PaikkaSheet.tsx to use the new shared primitive — explicitly rejected this phase.
- A dedicated "missing coordinates" placeholder/empty-state UI for Step 6 — rejected as unnecessary.
