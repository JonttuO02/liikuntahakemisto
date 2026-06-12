# Phase 40: Wizard-konsolidointi & Cleanup - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase closes v1.9 with five cleanup items:

1. **CLEAN-01**: Delete all test accounts from `business_accounts` and `auth.users` via SQL migration; drop the dead `onboarding_completed` column from `business_accounts`.
2. **CLEAN-02**: Merge `OnboardingWizardInner` + `EditWizardInner` into a single `WizardInner(mode: 'onboarding' | 'edit')` at `app/business/WizardInner.tsx`.
3. **CLEAN-03**: Verify that `POST /api/business/update-paikka` already accepts all `claim_status` values — mark done, no code change.
4. **CLEAN-04**: Verify that `OnboardingWizardInner`'s `maxReachedStep` guard satisfies step-forward protection — mark done, no code change.
5. **CLEAN-05**: Verify that `/api/business/onboarding/submit` has no `onboarding_completed` write — mark done, no code change.

**Key finding from codebase scout:** CLEAN-03, CLEAN-04, and CLEAN-05 appear already implemented in the current code (Phase 39 or earlier work). The planner must verify each before writing any code for them.

</domain>

<decisions>
## Implementation Decisions

### Wizard merge (CLEAN-02)

- **D-01:** Create `app/business/WizardInner.tsx` — a single file accepting `mode: 'onboarding' | 'edit'` prop. This is the canonical location; both `app/business/onboarding/page.tsx` and `app/business/[id]/page.tsx` import from `../WizardInner` or `../../business/WizardInner`.
- **D-02:** Merge strategy: **rename + absorb** (pragmatic). Move `OnboardingWizardInner`'s logic to `WizardInner` as the base, then incorporate `EditWizardInner`'s logic as a clearly separated `mode === 'edit'` section. Do NOT force a unified UX — the two modes deliberately have different navigation patterns.
- **D-03:** The primary goal of the merge is **single-file maintenance** — bug fixes and step-level changes apply once, not twice. This is the acceptance criterion, not visual UX unification.
- **D-04:** Onboarding mode keeps all its current behavior: 6 steps, linear ProgressBar, `maxReachedStep` guard, draft-based state, auto-resume to saved step, `saveAndAdvance()`.
- **D-05:** Edit mode keeps all its current behavior: 5 tabs (tab bar, free navigation), local state from server-provided `paikka` prop, Preview button, step 1 = read-only info panel.
- **D-06:** Step 1 in edit mode stays as a read-only panel (nimi/osoite/laji + "Nimi ja sijainti on lukittu" message) — current `EditWizardInner` behavior, no UX change.
- **D-07:** After creating `WizardInner.tsx`, delete both `app/business/onboarding/OnboardingWizardInner.tsx` and `app/business/[id]/EditWizardInner.tsx`. Update the two parent pages to import and render `WizardInner` with the appropriate `mode` prop.
- **D-08:** `EditWizardInner` currently receives `paikka: Liikuntapaikka` and `paikkaId: number` as props. These become the edit-mode props on `WizardInner`. Onboarding mode needs no props (fetches its own data from Supabase).

### Test account deletion (CLEAN-01)

- **D-09:** Use a SQL migration file in `supabase/migrations/` to delete all test data. The migration must handle cascade: deleting from `auth.users` cascades to `business_accounts`, `business_paikka_links`, `onboarding_draft`, etc. OR delete in dependency order (child tables first, then `auth.users`).
- **D-10:** Drop the `onboarding_completed` column from `business_accounts` in the same migration (it is written by submit route but never read — confirmed by CLEAN-05 verification).
- **D-11:** The migration deletes ALL rows in `business_accounts` (all are test accounts). The safest pattern: `DELETE FROM business_accounts; DELETE FROM auth.users WHERE id IN (SELECT user_id FROM business_accounts)` — or rely on FK cascade. Claude's discretion on the exact deletion order and cascade handling.
- **D-12:** After migration, verify in Supabase Dashboard that `business_accounts` and `auth.users` (business entries) are empty. This is a UAT checkpoint.

### Pre-implemented items (CLEAN-03, CLEAN-04, CLEAN-05)

- **D-13:** The planner writes one verification plan that reads each of the three files and confirms compliance with the requirements. If all three pass, mark as done — zero code changes. If any check fails, add targeted fixes.
- **D-14:** Files to check: `app/api/business/update-paikka/route.ts` (CLEAN-03), `app/business/onboarding/OnboardingWizardInner.tsx` lines 159–166 (CLEAN-04), `app/api/business/onboarding/submit/route.ts` (CLEAN-05).

### Claude's Discretion

- Exact SQL deletion order / cascade approach in the migration (dependency order vs ON DELETE CASCADE)
- Whether `WizardInner` keeps the `PaikkaInfo` type local or moves it to `lib/types.ts` (it's onboarding-internal, probably stays local)
- Whether to add a `WizardInnerProps` interface or use a discriminated union type for the mode-conditional props (`mode: 'edit'; paikka: Liikuntapaikka; paikkaId: number` vs `mode: 'onboarding'`)
- Migration timestamp naming

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — CLEAN-01 through CLEAN-05 (Phase 40 scope and success criteria)
- `.planning/ROADMAP.md` §Phase 40 — Goal and success criteria

### Files being merged (CLEAN-02)
- `app/business/onboarding/OnboardingWizardInner.tsx` — full source; becomes the base for `WizardInner` onboarding mode
- `app/business/[id]/EditWizardInner.tsx` — full source; edit mode to absorb into `WizardInner`
- `app/business/onboarding/page.tsx` — currently renders `<OnboardingWizardInner />` — update to `<WizardInner mode="onboarding" />`
- `app/business/[id]/page.tsx` — currently renders `<EditWizardInner paikka={paikka} paikkaId={paikkaId} />` — update to `<WizardInner mode="edit" paikka={paikka} paikkaId={paikkaId} />`

### Files to verify (CLEAN-03/04/05)
- `app/api/business/update-paikka/route.ts` — check line ~39: ownership query must have no `claim_status` filter (CLEAN-03)
- `app/business/onboarding/OnboardingWizardInner.tsx` lines 159–166 — `maxReachedStep` guard (CLEAN-04)
- `app/api/business/onboarding/submit/route.ts` — full file scan for `onboarding_completed` (CLEAN-05)

### Files for CLEAN-01 migration
- `supabase/migrations/` — existing migrations for timestamp sequencing
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_accounts` schema (FK relationships)

### Existing patterns to follow
- `lib/supabase-business.ts` — `createBusinessBrowserClient()` used by both wizard modes
- `app/business/onboarding/` — all Step components (StepPaikka, StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot, StepEsikatselu) stay unchanged
- `app/components/PreviewModal.tsx` — imported by `EditWizardInner` for preview button; must also be imported by `WizardInner`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/business/onboarding/OnboardingWizardInner.tsx` — full onboarding shell; becomes `WizardInner` base
- `app/business/[id]/EditWizardInner.tsx` — edit shell to absorb; already imports step components from `../onboarding/`
- `app/business/onboarding/ProgressBar.tsx` — onboarding mode only; not used in edit mode
- `app/components/PreviewModal.tsx` — edit mode only (preview button); not in onboarding flow
- `app/business/onboarding/UploadDropZone.tsx`, `UploadProgressBar.tsx` — used inside `StepMediat`, not in wizard shell directly

### Established Patterns
- **Step components**: All step components (`StepMediat`, `StepHinnasto`, etc.) accept `editMode?: boolean` prop — already designed for dual-mode use
- **Auth in wizard**: Currently both wizards call `createBusinessBrowserClient().auth.getUser()` in a useEffect for auth loading state. With Phase 39's middleware guard, unauthenticated users never reach these pages. The auth useEffect can be simplified or kept — Claude's discretion.
- **paikka_id in URL**: Onboarding uses `?paikka_id=N` URL param; edit mode uses route param `[id]` (already in `paikkaId` prop) — both patterns must coexist in `WizardInner`
- **Supabase client**: Both wizards use `createBusinessBrowserClient()` from `lib/supabase-business.ts`

### Integration Points
- `app/business/onboarding/page.tsx` — wraps in `<Suspense>` currently; must stay compatible after switching to `WizardInner`
- `app/business/[id]/page.tsx` — RSC that fetches `paikka` server-side and passes as prop; no change needed there
- `app/business/[id]/layout.tsx` — passthrough layout, no changes needed

</code_context>

<specifics>
## Specific Ideas

- The merge's acceptance criterion is: one file to find when debugging, one file to fix when a bug is found. Not visual UX unification.
- `WizardInner` at `app/business/WizardInner.tsx` (business root level) — neutral location, imported by both onboarding and edit pages.
- Edit mode: tab bar UX, free navigation, local state — keep exactly as is.
- Onboarding mode: linear ProgressBar, `maxReachedStep` guard, draft state — keep exactly as is.
- The migration should delete ALL business_accounts rows (all are test) and drop `onboarding_completed` column in the same transaction.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 40-wizard-konsolidointi-cleanup*
*Context gathered: 2026-06-12*
