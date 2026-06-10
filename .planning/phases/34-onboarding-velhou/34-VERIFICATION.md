---
phase: 34-onboarding-velhou
verified: 2026-06-10T00:00:00Z
status: gaps_found
score: 9/13 must-haves verified
overrides_applied: 0
gaps:
  - truth: "6-step wizard at /business/onboarding — step 2 (media upload) is accessible to users"
    status: failed
    reason: "OnboardingWizardInner.tsx line 148 renders {step === 2 && null}. StepMediat.tsx is imported but never mounted. The media upload step (ONBOARD-03) is dead code — the wizard silently skips step 2 and advances from step 1 directly to step 3."
    artifacts:
      - path: "app/business/onboarding/OnboardingWizardInner.tsx"
        issue: "step === 2 && null — StepMediat never rendered (CR-05)"
    missing:
      - "Replace {step === 2 && null} with <StepMediat paikkaId={paikkaId} businessAccountId={userId} onNext={() => saveAndAdvance(2)} onPrev={() => goToStep(1)} />"
      - "Add userId state to OnboardingWizardInner resolved from session inside loadDraft"
  - truth: "POST /api/business/onboarding/save-step verifies authenticated user owns the paikka_id before accepting draft data"
    status: failed
    reason: "save-step/route.ts parses paikka_id from request body (line 29) and UPSERTs without any ownership check against business_paikka_links. Any authenticated business user can create or merge a draft row keyed to any paikka_id they do not own. The submit route's ownership check is insufficient mitigation because the malicious draft already exists (CR-01)."
    artifacts:
      - path: "app/api/business/onboarding/save-step/route.ts"
        issue: "No business_paikka_links ownership check on paikka_id from body (CR-01)"
    missing:
      - "After parsing paikkaId, add: select id from business_paikka_links where business_account_id = user.id and paikka_id = paikkaId; return 403 if no row found"
  - truth: "Step 6 preview renders PaikkaSheet (per ONBOARD-07 requirement)"
    status: failed
    reason: "REQUIREMENTS.md ONBOARD-07 specifies '(PaikkaKortti, DiagonaalKortti, PaikkaSheet)'. StepEsikatselu.tsx intentionally omits PaikkaSheet due to its position:fixed layout constraint (documented in RESEARCH.md Pitfall 1 and in the PLAN). Only a simplified inline .glass card is rendered in place of PaikkaSheet. The requirement text is not met literally."
    artifacts:
      - path: "app/business/onboarding/StepEsikatselu.tsx"
        issue: "PaikkaSheet not rendered — simplified card used instead (architectural constraint documented)"
    missing:
      - "Either update REQUIREMENTS.md ONBOARD-07 to remove PaikkaSheet from the list, or implement a non-fixed-position version of the profile view for the wizard preview"
  - truth: "StepMediat.businessAccountId derives from session, not from an unvalidated prop"
    status: failed
    reason: "StepMediat.tsx accepts businessAccountId: string as a prop interface. CR-02 from the code review documents that this prop is never validated against session.user.id. Combined with CR-05 (step is dead), this creates a future security defect when step 2 is wired."
    artifacts:
      - path: "app/business/onboarding/StepMediat.tsx"
        issue: "businessAccountId prop used as storage path prefix; should be derived from session.user.id inside component (CR-02)"
    missing:
      - "Remove businessAccountId from StepMediatProps; derive path prefix from supabase.auth.getSession() session.user.id inside handleNext"
---

# Phase 34: Onboarding Wizard Verification Report

**Phase Goal:** Build the onboarding wizard for business users — a 6-step wizard at /business/onboarding that guides a business owner through venue info, media upload, pricing, opening hours, contact info, and a preview before submitting to create/update their listing.
**Verified:** 2026-06-10T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Wizard route exists at /business/onboarding with Suspense wrapper | VERIFIED | app/business/onboarding/page.tsx exists; no 'use client'; wraps OnboardingWizardInner in Suspense |
| 2 | ProgressBar shows 6 steps, highlights current step, marks completed steps with checkmark | VERIFIED | ProgressBar.tsx: 6 stepLabels, completed/current/future state classes, Check icon, aria-current="step" |
| 3 | Wizard loads existing onboarding_draft on mount and resumes from current_step | VERIFIED | OnboardingWizardInner.tsx: loadDraft useEffect loads draft via supabase, calls goToStep(draft.current_step) when step=1 |
| 4 | Step 1 (StepPaikka) displays venue name and address from business_paikka_links | VERIFIED | StepPaikka.tsx: renders paikkaInfo.nimi + osoite/kaupunki; OnboardingWizardInner resolves paikka_id from URL param or business_paikka_links query |
| 5 | Step 2 (StepMediat) media upload is accessible to users in the wizard | FAILED | OnboardingWizardInner.tsx line 148: {step === 2 && null}. StepMediat is imported but never rendered (CR-05). Media never collected. |
| 6 | Step 3 (StepHinnasto) pricing table with at least-one-price validation gate | VERIFIED | StepHinnasto.tsx: 4 fixed rows + dynamic rows; hasAnyPrice gate disables Seuraava; save-step call with field='hinnasto' |
| 7 | Step 4 (StepAukioloajat) stores data with English day keys; pre-fills from paikkaInfo | VERIFIED | StepAukioloajat.tsx: ORDERED_DAYS whitelist enforced; useEffect pre-fills from existingAukioloajat; saves with English keys |
| 8 | Step 5 (StepYhteystiedot) collects contact info; description 300-char limit enforced | VERIFIED | StepYhteystiedot.tsx: maxLength={300}; char counter turns text-red-600 at limit; aria-describedby wired |
| 9 | Step 6 (StepEsikatselu) renders PaikkaKortti and DiagonaalKortti with draft data | VERIFIED | StepEsikatselu.tsx: buildDraftAsPaikka constructs preview; PaikkaKortti + DiagonaalKortti rendered with draftAsPaikka prop |
| 10 | Step 6 (StepEsikatselu) renders PaikkaSheet per ONBOARD-07 requirement | FAILED | ONBOARD-07 requires PaikkaSheet. StepEsikatselu intentionally omits it (position:fixed architectural constraint). Simplified inline card used instead. Requirement text not satisfied. |
| 11 | Submit button POSTs to /api/business/onboarding/submit and redirects to /business | VERIFIED | StepEsikatselu.tsx: POST to /api/business/onboarding/submit with JWT; on data.ok: router.push('/business') |
| 12 | save-step route verifies JWT and uses user.id from token (not body) for business_account_id | VERIFIED | save-step/route.ts: supabaseAdmin.auth.getUser(token); UPSERT uses user.id; comment confirms intent |
| 13 | save-step route verifies user owns paikka_id before accepting draft data | FAILED | No business_paikka_links ownership check in save-step/route.ts. paikka_id taken from body without validation (CR-01) |

**Score:** 9/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/onboardingUtils.ts` | Pure functions buildDraftAsPaikka, hinnastaToHintaKuvaus, FI_TO_EN, ORDERED_DAYS | VERIFIED | All 4 exports present; no Supabase imports |
| `lib/onboardingUtils.test.ts` | 21 unit tests covering ONBOARD-04 through ONBOARD-07 | VERIFIED | 21 tests; describe blocks for hinnastaToHintaKuvaus, buildDraftAsPaikka, FI_TO_EN, maxLength |
| `vitest.config.ts` | include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts'] | VERIFIED | All 3 globs present |
| `supabase/migrations/20260606000000_onboarding.sql` | onboarding_draft table + onboarding_completed column + 4 RLS policies | VERIFIED | Full DDL with UNIQUE constraint; all 4 RLS policies scoped to auth.uid() = business_account_id |
| `messages/fi.json` | 34 wizard i18n keys under Business namespace | VERIFIED | onboardingTitle, submitCta, errorNoPriceRow, errorSubmitFailed all present |
| `messages/en.json` | 34 wizard i18n keys under Business namespace | VERIFIED | Same key set in English |
| `app/components/ClaimSearchForm.tsx` | router.push to /business/onboarding on claim/create success | VERIFIED | 2x router.push calls; 0x window.location.reload() |
| `app/business/page.tsx` | onboarding_completed gate with router.push to /business/onboarding | VERIFIED | onboarding_completed queried in checkLinks(); redirect when account && !account.onboarding_completed |
| `app/api/business/onboarding/save-step/route.ts` | JWT-verified UPSERT; user.id from token; no ownership check | VERIFIED (partial) | JWT + UPSERT working; MISSING ownership check on paikka_id (CR-01 BLOCKER) |
| `app/api/business/onboarding/submit/route.ts` | JWT; business_paikka_links ownership; atomic liikuntapaikat update | VERIFIED | All 7 steps present; ownership check at step 2; draft preserved on error |
| `app/business/onboarding/page.tsx` | Suspense wrapper; no 'use client' | VERIFIED | Thin server component; Suspense with spinner fallback |
| `app/business/onboarding/OnboardingWizardInner.tsx` | 6 steps wired; draft load; URL step routing | FAILED | Step 2 renders null instead of StepMediat (CR-05) |
| `app/business/onboarding/ProgressBar.tsx` | 6-step progress indicator | VERIFIED | Correct state classes; Check icon; aria-current; step labels |
| `app/business/onboarding/StepPaikka.tsx` | Step 1 read-only venue display | VERIFIED | Renders nimi + osoite/kaupunki; Seuraava button |
| `app/business/onboarding/StepMediat.tsx` | Step 2 media upload (exists on disk) | STUB | File exists with full implementation but is never rendered by wizard (CR-05) |
| `app/business/onboarding/UploadDropZone.tsx` | Drag-and-drop file zone | VERIFIED | HTML5 drag events; MIME + size validation; animated thumbnails; accessible |
| `app/business/onboarding/UploadProgressBar.tsx` | CSS progress bar | VERIFIED | pct=0 returns null; CSS transition-[width]; no Framer Motion |
| `app/business/onboarding/StepHinnasto.tsx` | Step 3 pricing table with hasAnyPrice gate | VERIFIED | 4 fixed rows; dynamic rows; hasAnyPrice disables Seuraava |
| `app/business/onboarding/StepAukioloajat.tsx` | Step 4 hours editor with English keys | VERIFIED | ORDERED_DAYS whitelist; role="switch" toggles; Google Places pre-fill |
| `app/business/onboarding/StepYhteystiedot.tsx` | Step 5 contact form; 300-char limit | VERIFIED | maxLength=300; text-red-600 counter; aria-describedby |
| `app/business/onboarding/StepEsikatselu.tsx` | Step 6 preview + submit (PaikkaSheet omitted by design) | PARTIAL | PaikkaKortti + DiagonaalKortti verified; PaikkaSheet absent (contradicts ONBOARD-07 text) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| ClaimSearchForm.tsx | /business/onboarding | router.push on success | VERIFIED | 2 occurrences confirmed; window.location.reload() absent |
| business/page.tsx | /business/onboarding | onboarding_completed check | VERIFIED | onboarding_completed queried; redirect on !onboarding_completed |
| OnboardingWizardInner.tsx | onboarding_draft | createBrowserSupabase SELECT | VERIFIED | .from('onboarding_draft').select('*').eq('business_account_id', user.id) |
| OnboardingWizardInner.tsx | StepMediat | step === 2 render | FAILED | {step === 2 && null} — StepMediat never rendered |
| StepHinnasto.tsx | /api/business/onboarding/save-step | fetch with JWT, field='hinnasto' | VERIFIED | fetch with Authorization header; body contains field:'hinnasto' |
| StepAukioloajat.tsx | /api/business/onboarding/save-step | fetch with JWT, field='aukioloajat', English keys | VERIFIED | ORDERED_DAYS whitelist; English keys in save payload |
| StepYhteystiedot.tsx | /api/business/onboarding/save-step | fetch with JWT, field='yhteystiedot' | VERIFIED | JWT in Authorization header; field='yhteystiedot' in body |
| StepEsikatselu.tsx | lib/onboardingUtils.buildDraftAsPaikka | named import | VERIFIED | import present; draftAsPaikka = buildDraftAsPaikka(draft, paikkaInfo) |
| StepEsikatselu.tsx | /api/business/onboarding/submit | fetch with JWT | VERIFIED | POST with Authorization; router.push('/business') on data.ok |
| save-step/route.ts | onboarding_draft | supabaseAdmin UPSERT onConflict | VERIFIED | onConflict: 'business_account_id,paikka_id' |
| save-step/route.ts | business_paikka_links ownership | missing check | FAILED | No ownership check — paikka_id accepted from body without validation |
| submit/route.ts | business_paikka_links | ownership check before liikuntapaikat update | VERIFIED | .from('business_paikka_links').eq('business_account_id', user.id).eq('paikka_id', draft.paikka_id) |
| submit/route.ts | liikuntapaikat | UPDATE after ownership check | VERIFIED | Full field list including business_managed:true |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| StepEsikatselu.tsx | draftAsPaikka | buildDraftAsPaikka(draft, paikkaInfo) | Conditional — draft.media_urls is always null (step 2 dead) | HOLLOW for image_url; other fields can flow |
| OnboardingWizardInner.tsx | draft | supabase.from('onboarding_draft') | Real DB query | FLOWING |
| OnboardingWizardInner.tsx | paikkaInfo | supabase.from('liikuntapaikat') | Real DB query | FLOWING |

### Behavioral Spot-Checks

Step 7b skipped — no runnable server available. Key behaviors verified statically above.

### Probe Execution

Step 7c — no probe scripts defined for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ONBOARD-01 | 34-02, 34-03, 34-05, 34-06 | Automaattinen wizard-kayttoonotto ensimmaisella kirjautumisella | SATISFIED | onboarding_completed gate in business/page.tsx; ClaimSearchForm redirect; wizard page exists |
| ONBOARD-02 | 34-03, 34-06 | Vaihe 1 — Paikka: esitaytetty nimi ja osoite | SATISFIED | StepPaikka renders paikkaInfo from business_paikka_links join |
| ONBOARD-03 | 34-07 | Vaihe 2 — Mediat: 1-5 kuvaa + logo; edistymispalkki | BLOCKED | StepMediat.tsx exists but wizard renders null for step 2 (CR-05); media never uploaded |
| ONBOARD-04 | 34-01, 34-08 | Vaihe 3 — Hinnasto; vahintaan yksi hintarivi pakollinen | SATISFIED | hasAnyPrice gate verified; hinnastaToHintaKuvaus tested; unit tests pass |
| ONBOARD-05 | 34-01, 34-08 | Vaihe 4 — Aukioloajat; Google Places esitayttona | SATISFIED | StepAukioloajat pre-fills from existingAukioloajat; English day keys enforced |
| ONBOARD-06 | 34-09 | Vaihe 5 — Yhteystiedot; kuvaus max 300 merkkia | SATISFIED | maxLength=300; red counter at limit; aria-describedby |
| ONBOARD-07 | 34-09 | Vaihe 6 — Esikatselu: PaikkaKortti, DiagonaalKortti, PaikkaSheet | BLOCKED | PaikkaSheet intentionally omitted (position:fixed architectural constraint). Requirement text lists PaikkaSheet explicitly. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| app/business/onboarding/OnboardingWizardInner.tsx | 148 | `{step === 2 && null}` — dead step | BLOCKER | Media upload step never executed; ONBOARD-03 not deliverable |
| app/api/business/onboarding/save-step/route.ts | 29, 61-72 | paikka_id from body without ownership check | BLOCKER | Security: any authenticated user can pollute draft for any venue (CR-01) |
| app/business/onboarding/UploadDropZone.tsx | 106 | URL.createObjectURL in render without revoke | WARNING | Memory leak on every render (CR-04) |
| app/api/business/onboarding/submit/route.ts | 20-24 | .single() instead of .maybeSingle() | WARNING | PostgREST throws 406 on empty result instead of clean null/404 (CR-03) |
| app/business/onboarding/StepMediat.tsx | 62, 88 | businessAccountId from prop used as Storage path | WARNING | When step is wired, path prefix will not be validated against session.user.id (CR-02) |

### Human Verification Required

1. **Supabase schema live check**
   **Test:** Open Supabase dashboard; navigate to Table Editor and confirm onboarding_draft table exists with all 9 columns; navigate to Authentication -> Policies and confirm 4 RLS policies on onboarding_draft; confirm business_accounts.onboarding_completed column exists.
   **Expected:** All schema elements present and active.
   **Why human:** Cannot verify live Supabase schema from static file inspection.

2. **End-to-end wizard flow (steps 1, 3, 4, 5, 6)**
   **Test:** Log in as a business user who has completed Phase 33 claim/create flow. Visit /business/onboarding. Complete steps 1, 3, 4, 5, then step 6. Click "Laheta hyvaksyttavaksi".
   **Expected:** Wizard progresses through all steps. Step 6 shows PaikkaKortti and DiagonaalKortti with entered data. Submit redirects to /business. Supabase: onboarding_draft row deleted; business_accounts.onboarding_completed = true; liikuntapaikat updated.
   **Why human:** Requires live Supabase instance with authenticated business user.

3. **ClaimSearchForm redirect (post-claim)**
   **Test:** Complete Phase 33 claim or create flow as a new business user.
   **Expected:** On success, browser navigates to /business/onboarding (not a page reload).
   **Why human:** Requires full auth flow in a running browser.

### Gaps Summary

Three blockers prevent the phase goal from being fully achieved:

**Blocker 1 (CR-05) — StepMediat dead code:** The wizard's step 2 (`{step === 2 && null}`) never renders StepMediat. StepMediat.tsx is fully implemented and imported, but wiring was deferred from Plan 07 and never completed in Plans 08 or 09. ONBOARD-03 (media upload) is not deliverable in the current state. The wizard skips from step 1 directly to step 3 with no media collection. image_url is always null in the submitted liikuntapaikat row.

**Blocker 2 (CR-01) — save-step missing ownership check:** The save-step route accepts an arbitrary paikka_id from the request body and UPSERTs without verifying that the authenticated user owns that venue via business_paikka_links. This allows any authenticated business user to pollute draft rows keyed to venues they do not own. The submit route's ownership check does not retroactively mitigate this.

**Blocker 3 (ONBOARD-07 vs implementation) — PaikkaSheet absent from preview:** REQUIREMENTS.md ONBOARD-07 explicitly lists PaikkaSheet as a required preview component. The implementation intentionally omits it for architectural reasons (position:fixed). The phase plan documents this deviation and provides a simplified inline card as a substitute. However, the requirement text is not satisfied as written. The plan-level decision to omit PaikkaSheet is documented and defensible, but the requirement needs to be updated or an override accepted.

**Root cause grouping:** Blockers 1 and 3 share the same root cause — incomplete wiring in the final execution wave (Plans 08/09 did not close the gaps left by Plan 07). Blocker 2 is a separate security omission in the save-step route design.

---

_Verified: 2026-06-10T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
