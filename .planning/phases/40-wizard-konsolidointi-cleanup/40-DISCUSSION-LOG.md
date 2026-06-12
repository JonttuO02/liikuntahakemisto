# Phase 40: Wizard-konsolidointi & Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 40-wizard-konsolidointi-cleanup
**Areas discussed:** Wizard merge strategy, Pre-implemented items, Test account deletion

---

## Wizard merge strategy

### Merge depth

| Option | Description | Selected |
|--------|-------------|----------|
| True merge (one file, mode branches) | One WizardInner.tsx with mode: 'onboarding' \| 'edit'. Both modes' full logic in one file with conditional branches. | |
| Rename + absorb (pragmatic) | Rename OnboardingWizardInner → WizardInner, move EditWizardInner's logic into the same file as clearly labeled section. | |
| Choose the best option | User deferred to Claude with context | ✓ |

**User's choice:** "Choose the best option. Most important is that the same component is used in all onboardings. So that bug fixes etc dont have to be done one by one in all of those. That was the main problem."

**Notes:** The goal is single-file maintenance, not UX unification. Bug fixes should apply once, not twice. Rename + absorb approach chosen.

---

### File location

| Option | Description | Selected |
|--------|-------------|----------|
| app/business/WizardInner.tsx | Neutral location at business root, importable by both onboarding and edit pages. | ✓ |
| app/business/onboarding/WizardInner.tsx | Keeps it near step components but creates awkward import path for edit pages. | |

**User's choice:** app/business/WizardInner.tsx (Recommended)

---

### Edit step 1

| Option | Description | Selected |
|--------|-------------|----------|
| Keep read-only info panel | Current behavior — shows nimi/osoite/laji with locked message. | ✓ |
| Remove step 1 from edit mode | Start edit directly at mediat. | |

**User's choice:** Keep read-only info panel (Recommended)

---

## Pre-implemented items

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + mark done | Read each file, confirm compliance, mark requirements done. No code changes. | ✓ |
| Re-implement from scratch | Ignore current code and re-apply each fix. | |

**User's choice:** Verify + mark done (Recommended)

**Notes:** CLEAN-03 (update-paikka 403), CLEAN-04 (step guard), and CLEAN-05 (onboarding_completed) all appear already implemented from prior phases. One verification plan confirms all three.

---

## Test account deletion

### Deletion approach

| Option | Description | Selected |
|--------|-------------|----------|
| Manual via Supabase Dashboard | No code artifact. | |
| SQL migration file | Tracked in git, reproducible. | ✓ |

**User's choice:** SQL migration file (Recommended)

---

### Column cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Drop the column via migration | Remove dead onboarding_completed column. Clean. | ✓ |
| Leave the column | Writes gone, column stays unused. | |

**User's choice:** Drop the column via migration (Recommended)

---

## Claude's Discretion

- Exact SQL deletion order / cascade approach in the migration
- Whether `WizardInner` keeps `PaikkaInfo` type local or moves to `lib/types.ts`
- Whether to use a discriminated union type for mode-conditional props
- Migration timestamp naming

## Deferred Ideas

None — discussion stayed within phase scope.
