# Phase 50: Flow-uudelleenjärjestys - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 50-Flow-uudelleenjärjestys
**Areas discussed:** Reorder architecture, In-flight draft migration, Progress bar & step labels

---

## Reorder architecture

| Option | Description | Selected |
|--------|-------------|----------|
| StepPaikka becomes pre-phase | Mirrors AnalysoiSivusto's current pre-phase pattern; wizard shrinks to 5 numbered steps | ✓ |
| Fold both into WizardInner as steps 1+2 | Wizard grows to 7 numbered steps; AnalysoiSivusto becomes a true numbered step | |
| Just swap render order, keep current step numbers | Adds a redundant second venue-confirm screen | |

**User's choice:** StepPaikka becomes pre-phase (Recommended)
**Notes:** Smallest change, mirrors existing PrePhase pattern exactly.

| Option | Description | Selected |
|--------|-------------|----------|
| onSkip stays same as today | setPagePhase('wizard') lands on new Step 1 (StepMediat) | ✓ |
| Skip returns to StepPaikka instead | Adds unnecessary re-confirm path | |

**User's choice:** Yes, same as today (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Update quick-accept literal to 5 | Keeps current_step within new 1-5 valid range | ✓ |
| Leave as 6, widen validation | Special-cases an unnecessary sentinel value | |

**User's choice:** Initially asked for clarification ("What do you mean submit deletes the draft right after?") — answered that `submit/route.ts` deletes the `onboarding_draft` row on success (lines 110-112), so the step:6→5 write only matters if submit fails partway. User then chose: Update literal to 5 for consistency (Recommended).

---

## In-flight draft migration

| Option | Description | Selected |
|--------|-------------|----------|
| One-time DB migration: subtract 1 from old step≥2 | Deterministic, no runtime branching | ✓ |
| Reset all in-flight drafts to step 1 | Forces re-clicking through completed steps | |
| Runtime clamp/guard only, no migration | Wrong destination for shifted steps — semantically incorrect | |

**User's choice:** One-time DB migration: subtract 1 from old step≥2 (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Tighten both DB and app validation to 1-5 | Keeps both layers in sync | ✓ |
| Only update app-level validation | Leaves DB constraint untouched if any exists | |

**User's choice:** Tighten both to 1-5 (Recommended)
**Notes:** Investigation found no DB-level CHECK constraint exists today — only the save-step route's manual bounds check needs updating; no schema change needed beyond the data migration itself.

---

## Progress bar & step labels

| Option | Description | Selected |
|--------|-------------|----------|
| Drop stepPlaceName from stepLabels array | 5 entries matching the 5 numbered steps | ✓ |
| Keep 6 labels, show StepPaikka as permanently-completed first circle | Adds fake state to a progress component | |

**User's choice:** Yes, drop stepPlaceName from array (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| No progress bar on pre-phases | Matches existing AnalysoiSivusto behavior | ✓ |
| Add a lightweight indicator for pre-phases | Scope creep beyond FLOW-01/FLOW-04 | |

**User's choice:** Yes, no progress bar on pre-phases (Recommended)

---

## Claude's Discretion

- Exact prop/callback shape for the new StepPaikka pre-phase wrapper in page.tsx
- Whether paikkaInfo fetch logic is reused/extracted from WizardInner or refetched
- Exact migration file naming/comment convention (follow existing timestamp-prefix pattern)

## Deferred Ideas

None — discussion stayed within phase scope (FLOW-01, FLOW-04). FLOW-02/FLOW-03 were already moved to Phase 48 prior to this discussion.
